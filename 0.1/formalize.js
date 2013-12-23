/**
 * 对表单和表单域的操作。
 *
 * 设置数据，作为伪表单。
 * 添加表单域（指定的表单类型）
 * 支持表单域校验。
 *
 *＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *
 * 支持表单域的关联数据更新？update
 *
 * 支持约定接口的自定义表单组件。（需要根据需要实现：getValue、setValue、disable、enable、update、validate等接口方法）
 *
 * 提供事件管理？radio的checked事件等。
 *
 */
KISSY.add(function(S, D, E, IO) {

    /**
     * 判断表单元素判断类型。与Field对象类对应。
     * checkbox、radio、file、select为特殊类型。其他大多归属于text类型。
     * 将按钮类型的归属为button。[button, submit, image, reset]
     * html5中新的表单类型，暂时都作为text类型处理。后续有相关的field实现的时候再区分出来即可。[color, date, datetime, datetime-local, email, month, number,range, tel, time, url, week]
     * textarea作为text类型。
     * @param elem
     * @private
     */
    var inputButton = ["button", "submit", "image", "reset"],
        inputCheck = ["radio", "checkbox"],
        inputText = ["color", "date", "datetime", "datetime-local", "email", "month", "number","range", "tel", "time", "url", "week"],
        inputSpec = ['file'],
        typeAsTypeAttribute = inputCheck.concat(inputSpec),
        typeAsTag = ["button", "select"];

    function _getFieldType(elem) {
        if(!elem) return;

        var tagName = elem.tagName.toLowerCase(),
            attrType = D.attr(elem, "type"),
            type;

        if(tagName == "input") {
            if(S.inArray(attrType, typeAsTypeAttribute)) {
                type = attrType;
            }else if(S.inArray(attrType, inputButton)) {
                type = "button";
            }else {
                type = "text"
            }
        }else {
            if(tagName == "textarea") {
                type = "text";
            }else {
                type = tagName;
            }
        }

        return type;
    }

    var def = {
            // 理想化的表单，name值应该与表单域一一对应（除了radio）。但实际上，我们会发现checkbox也常常会被这样使用。所以本组件定义了name值在相同类型的表单域上是唯一的。当前配置默认为false，表示一个name值可以对应多个相同类型的表单域。若为true则表示可以对应多个不同类型的表单域。
            // 注意：目前不支持配置。强调一下而已。。。
            polymorphic: false,
            async: true
        },
        defIO = {
            type: "get",
            dataType: "json"
        };

    function Formalize() {
        this._init.apply(this, arguments);
    }

    S.augment(Formalize, S.EventTarget, {
        _init: function(config) {
            var cfg = S.merge(def, config);

            if(cfg.io) {
                this.IOSetup = S.merge(defIO, cfg.io);
                delete cfg.io;
            }

            this.cfg = cfg;
            this._disableMap = {};
            this.disabled = false;

            /**
             * {
             *  fieldName: {
             *      field: FieldInstance,
             *      events: {
             *          update: [function],
             *          validate: [function]
             *      }
             *   }
             * }
             */
            this._fields = {}
        },
        /**
         * 设置form表单。
         * @param form
         */
        attach: function(form) {
            var self = this;

            this.elForm = form;

            this.IOSetup = S.merge(defIO, {
                url: form.action,
                type: form.method
            });

            // 若表单中的数据与_fields有相同的数据，以表单数据为主。
            S.each(this._fields, function(map, name) {
                var field = self._getFieldByElement(name);
                if(field) {
                    map.field = field;
                }
            });
        },
        /**
         * 根据name获取field对象。
         * 先从_fields中获取数据，若没有，会再尝试从注册的form表单中查找。
         * @param name
         * @returns {*}
         */
        getField: function(name) {
            var self = this,
                map = self._fields[name];

            return map ? map.field : self._getFieldByElement(name);
        },
        /**
         * 根据name设置field对象和events。
         * 会替换原有的field对象，添加新的事件（不替换）。
         * @param name
         * @param field
         * @param events
         */
        setField: function(name, field, events) {
            var self = this;

            this._attachField(name, field);

            S.each(events, function(fn, type) {
                self._attachEvents(name, type, fn);
            });
        },
        /**
         * 添加一个field对象。不允许存在相同的field对象。
         * @param name
         * @param field
         * @param events
         */
        addField: function(name, field, events) {

            if(this.getField(name)) {
                throw "exists field";
            }

            this.setField(name, field, events);
        },
        /**
         * 设置指定field对象的value
         * @param name
         * @param value
         */
        setValue: function(name, value) {
            var field = this.getField(name);

            field && field.setValue(value);
        },
        /**
         * 获取指定field对象的value值
         * @param name
         * @returns {*}
         */
        getValue: function(name) {
            var field = this.getField(name);

            return field && field.getValue(value);
        },
        /**
         * 设置field对象为不可用状态。
         * @param name
         */
        fieldDisable: function(name) {
            var field = this.getField(name);

            field && field.disable();
        },
        /**
         * 设置field对象为可用状态。
         * @param name
         */
        fieldEnable: function(name) {
            var field = this.getField(name);

            field && field.enable();
        },
        /**
         * form表单的disable
         * 多个模块都控制form表单的可用状态时，需要区分判断，否则会相互影响。
         */
        disable: function(reason) {
            var map = this._disableMap;

            map[reason] = true;

            if(!this.disabled) {
                this._disable(true);
            }
        },
        enable: function(reason) {
            var map = this._disableMap,
                enable = true;

            delete map[reason];

            S.each(map, function(disabled) {
                if(disabled) {
                    enable = false;
                    return false;
                }
            });

            if(enable && this.disabled) {
                this._disable(false);
            }
        },
        _disable: function(disabled) {

            this.disabled = disabled;

            this.fire("disabled");
        },
//        fieldValidate: function(name) {
//            var field = this.getField(name);
//
//            return field.validate && field.validate();
//        },
        validate: function() {

        },
        /**
         * 表单提交
         * @param config
         * 同步支持的配置为：
         * {
         *     async: true/false,
         *     url: "",
         *     type: "",
         *     data: {}
         * }
         * 异步支持的配置： async以及IO的配置。
         */
        submit: function(config) {
            if(this.disabled) return;

            var async = (config && config.async) || this.cfg.async;

            if(this.validate() === false) {
                return;
            }

            if(async) {
                this._asyncSubmit(config);
            }else {
                this._syncSubmit(config);
            }
        },
        _syncSubmit: function(config) {
            var self = this,
                elForm = self.elForm || self._createForm(),
                cfg = S.merge(self.IOSetup, config);

            // 如果有新增参数，则构造隐藏域添加到表单中。
            if(cfg.data) {
                var fragment = document.createDocumentFragment();

                S.each(cfg.data, function(val, name) {
                    var el = self._createElement(name, val);
                    fragment.appendChild(el);

                    self.addField(name, new Field(el));
                });

                elForm.appendChild(fragment);
            }

            D.attr(elForm, {
                action: cfg.url,
                method: cfg.type
            });

            elForm.submit();
        },
        _createElement: function(name, val) {
            var html = S.substitute('<input type="hidden" name="{name}" value="{value}" />', {
                    name: name,
                    value: val
                }),
                el = D.create(html);

            return el;
        },
        _asyncSubmit: function(config) {
            var self = this,
                elForm = self.elForm,
                cfg = S.merge(self.IOSetup, config);

            if(elForm) {
                cfg.form = elForm;
            }

            IO(cfg);
        },
        /**
         * 从form表单中获取表单域元素。
         * 然后设置渲染表单域为field对象并返回。
         * @param name
         * @returns {*|boolean|*}
         * @private
         */
        _getFieldByElement: function(name) {
            var elements = this._getOriginElements(name);

            return elements &&
                elements.length > 0 &&
                this._decorateFactory(elements);
        },
        /**
         * 获取指定name的原生表单域元素
         * 若不存在对应的表单域，则返回undefined；若存在，则返回数组。
         * @param name
         * @returns {*}
         * @private
         */
        _getOriginElements: function(name) {
            var elForm = this.elForm;

            if(!elForm) return;

            var elements = elForm.elements[name];

            if(!elements) return;

            // 处理一下select表单域，否则makeArray会取出option来。
            if(elements.tagName && elements.tagName.toLowerCase() === "select") {
                elements = [elements];
            }

            return S.filter(S.makeArray(elements), function(element) {
                return element &&
                    // 过滤掉object元素
                    element.tagName.toLowerCase() !== "object" &&
                    // 过滤掉id相同但name不同的元素
                    element.getAttribute("name") === name;
            })
        },
        /**
         * 根据元素类型进行渲染。添加到this._fields集合。
         * @param elements {Array<HTMLElement>} HTMLFormElement对象集合。暂只支持相同name且相同类型的元素集合。
         * @private
         */
        _decorateFactory: function(elements) {
            if(!elements || !elements[0]) return;

            var elTest = elements[0],
                name = elTest.name,
                type = _getFieldType(elTest);

            if(!type) {
                throw new Error("can not match a field class" + type);
            }

            var fieldClass = Formalize._FIELDS[type];

            if(!fieldClass) return;

            var instance = new fieldClass(elements);

            this._attachField(name, instance);

            return instance;
        },
        /**
         * 设置_fields的数据成员 （field属性）。
         * @param name
         * @param field
         * @returns {*}
         * @private
         */
        _attachField: function(name, field) {
            var map = this._makeFieldMap(name);

            map.field = field;

            return map;
        },
        /**
         * 设置_fields的数据成员（events属性）
         * @param name
         * @param type
         * @param fn
         * @returns {*}
         * @private
         */
        _attachEvents: function(name, type, fn) {
            var map = this._makeFieldMap(name);

            var evtType = map.events[type];

            evtType && evtType.push(fn);

            return map;
        },
        /**
         * 包装一个_fields的数据对象。
         * @param name
         * @returns {*}
         * @private
         */
        _makeFieldMap: function(name) {
            var map = this._fields[name];

            if(!map) {
                map = this._fields[name] = {
                    field: undefined,
                    events: {
                        update: [],
                        validate: []
                    }
                }
            }

            return map;
        },
        /**
         * 若在同步提交之前没有设置过form
         * 则在提交前构建出form来实现同步提交。
         * @returns {*}
         * @private
         */
        _createForm: function() {
            var elForm = D.create("<form></form>");

            document.body.append(elForm);

            return elForm;
        }
    });

    S.mix(Formalize, {
        addClass: function(key, cls) {
            var c = this._FIELDS[key];

            if(c) {
                throw new Error("exists Field Class");
            }

            this._FIELDS[key] = cls;
        },
        _FIELDS: {}
    });

    return Formalize;

}, {
    requires: ['dom', 'event', 'ajax']
});