/**
 * 对表单和表单域的操作。
 *
 * 表单绑定可以延后到调用submit方法时再绑定。
 * 获取form的表单元素自然是需要绑定以后才能获取到，否则只能获取手动设置的伪表单域。
 *
 * 只是为了表单提交的数据，可以直接设置隐藏域。是否有必要支持添加指定类型的表单域？
 *
 * 获取和设置表单域值。
 * 支持表单域校验。
 * 表单状态控制。
 *
 *＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *
 * 支持表单域的关联数据更新？update
 *
 *
 * 支持约定接口的自定义表单组件。（需要根据需要实现：getValue、setValue、disable、enable、update、validate等接口方法）
 *
 * 提供事件管理？radio的checked事件等。
 *
 *＝＝＝＝＝＝＝＝＝＝＝＝＝＝
 *
 * 是否统一包装成field对象，还是保持原生表单域的get/set？
 */
KISSY.add(function(S, D, E, IO) {

    function Field() {
        this._init.apply(this, arguments);
    }

    S.augment(Field, {
        _init: function(elems) {
            this.elements = S.makeArray(elems);
        },
        setValue: function(val) {
            D.val(this.elements, val);
        },
        getValue: function() {
            return S.map(this.elements, function(elem) {
                return D.val(elem);
            });
        },
        enable: function() {
            D.prop(this.elements, 'disabled', false);
        },
        disable: function() {
            D.prop(this.elements, 'disabled', true);
        }
    });

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
            type = "hidden";

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
        // TODO 添加attach的时候可能已经添加了一些自定义的数据。需要校验是否重复了。
        // 重复的话，怎么处理？
        // 以实际的表单为主！
        attach: function(form) {
            this.elForm = form;

            this.IOSetup = S.merge(defIO, {
                url: form.action,
                type: form.method
            });
        },
        getField: function(name) {
            var self = this,
                map = self._fields[name];

            return map ? map.field : self._getFieldByElement(name);
        },
        setField: function(name, field, events) {
            var self = this;

            this._attachField(name, field);

            S.each(events, function(fn, type) {
                self._attachEvents(name, type, fn);
            });
        },
        addField: function(name, field, events) {

            if(this.getField(name)) {
                throw "exists field";
            }

            this.setField(name, field, events);
        },
        setValue: function(name, value) {
            var field = this.getField(name);

            field && field.setValue(value);
        },
        getValue: function(name) {
            var field = this.getField(name);

            return field && field.getValue(value);
        },
        fieldDisable: function(name) {
            var field = this.getField(name);

            field && field.disable();
        },
        fieldEnable: function(name) {
            var field = this.getField(name);

            field && field.enable();
        },
        /**
         * form表单的disable
         * 多个模块都控制form表单的可用状态时，需要区分判断，否则会相互影响。
         */
        disable: function(reason) {

        },
        enable: function(reason) {

        },
        fieldValidate: function() {

        },
        validate: function() {

        },
        submit: function(config) {
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
        _getFieldByElement: function(name) {
            var elements = this._getOriginElements(name);

            return elements &&
                elements.length > 0 &&
                this._decorateFactory(elements);
        },
        _getOriginElements: function(name) {
            var elForm = this.elForm;

            if(!elForm) return;

            var elements = elForm.elements[name];

            if(!elements) return;

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
        _attachField: function(name, field) {
            var map = this._makeFieldMap(name);

            map.field = field;

            return map;
        },
        _attachEvents: function(name, type, fn) {
            var map = this._makeFieldMap(name);

            var evtType = map.events[type];

            evtType && evtType.push(fn);

            return map;
        },
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
        _createForm: function() {
            var elForm = D.create("<form></form>");

            document.body.append(elForm);

            return elForm;
        }
    });

    S.mix(Formalize, {
        _FIELDS: {
            text: Field
        }
    });

    return Formalize;

}, {
    requires: ['dom', 'event', 'ajax']
});