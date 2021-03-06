/*
combined files : 

kg/formalize/2.0.0/formalize
kg/formalize/2.0.0/index

*/
/**
 * 对表单和表单域的操作。
 *
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
KISSY.add('kg/formalize/2.0.0/formalize',function(S, D, E, IO) {

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
        typeAsTag = ["button", "select"],
        // 会被form.elements遍历出来，但是又不是我们需要的表单域类型。
        typeExclude = ["object", "fieldset"];

    function makeArrayForElement(element) {
        if(!element) return;

        var elements = element;
        // 处理一下select表单域，否则makeArray会取出option来。
        if(element.tagName && element.tagName.toLowerCase() === "select") {
            elements = [element];
        }

        return S.makeArray(elements);
    }

    // 識別如下類型表單域：
    // typeExclude / inputSpec / inputCheck / inputButton / typeAsTag
    function _getFieldType(elem) {
        if(!elem) return;

        var tagName = elem.tagName.toLowerCase(),
            attrType = D.attr(elem, "type"),
            type;

        if(S.inArray(tagName, typeExclude)) return;

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
                // typeAsTag
                type = tagName;
            }
        }

        return type;
    }

    var methods = ["getValue", 'setValue', 'disable', 'enable'];
    function isField(o) {
        return S.every(methods, function(name) {
            var method = o[name];
            return method && S.isFunction(method);
        });
    }

    var def = {
            // 理想化的表单，name值应该与表单域一一对应（除了radio）。但实际上，我们会发现checkbox也常常会被这样使用。所以本组件定义了name值在相同类型的表单域上是唯一的。当前配置默认为false，表示一个name值可以对应多个相同类型的表单域。若为true则表示可以对应多个不同类型的表单域。
            // 注意：目前不支持配置。强调一下而已。。。
//            polymorphic: false,
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

            this._validators = [];
            this._fnBeforeSubmit = [];
        },
        /**
         * 设置form表单。
         * @param form
         * @param traversal
         */
        attach: function(form, traversal) {
            var self = this,
                elForm = D.get(form),
                url = D.attr(elForm, 'action');

            this.elForm = elForm;

            this.IOSetup = S.merge(defIO, {
                url: url,
                type: D.attr(elForm, 'method')
            });

            // 若表单中的数据与_fields有相同的数据，以表单数据为主。
            S.each(this._fields, function(map, name) {
                var field = self._takeFieldByName(name);
                if(field) {
                    map.field = field;
                }
            });

            if(traversal) {
                // 把现有的表单域都添加进来。通过name而不要通过elements遍歷
                S.each(form.elements, function(element) {
                    var type = _getFieldType(element);

                    if(!type) return;

                    var name = element.getAttribute(name),
                        field = self._fields[name];

                    if(!field) {
                        // take方法已经实现了添加到 _fields 数据的逻辑
                        self._takeFieldByName(name);
                    }
                });
            }
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

            return map ? map.field : self._takeFieldByName(name);
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

            self._attachField(name, field);

            S.each(events, function(fn, type) {
                self._attachEvents(name, type, fn);
            });
        },
        /**
         * 添加一个field对象。
         * field对象是通过属性检测的方式来判断的，所以实现了对应的接口就会被认为是field对象。
         *      getValue/setValue/enable/disable
         * @param name
         * @param field
         * @param events
         * @returns {*}
         */
        addField: function(name, field, events) {
            if(!field || !isField(field)) {
                return;
            }

            this.setField(name, field, events);

            return field;
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

            return field && field.getValue();
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
        getReasons: function() {
            return this._disableMap;
        },
        isDisabled: function() {
            return this.disabled;
        },
        _disable: function(disabled) {

            this.disabled = disabled;

            this.fire("disabled");
        },
        /**
         * 需要在表单提交前执行的处理函数。
         */
        beforeSubmit: function(fn, args, context) {
            if(args && !context && !S.isArray(args)) {
                args = [];
                context = args;
            }
            this._fnBeforeSubmit.push({
                fn: fn,
                args: args,
                context: context
            });
        },
        /**
         * 在校验前执行的函数队列
         */
        onValidate: function(validator, args, context) {
            if(args && !context && !S.isArray(args)) {
                args = [];
                context = args;
            }
            this._validators.push({
                fn: validator,
                args: args,
                context: context
            });
        },
        /**
         * 调用指定的函数
         * 提交前执行相关函数
         * @fns {Array} 要执行的函数队列
         * @failbreak {Boolean} 函数返回值为false时，是否中断列队执行
         */
        _invoke: function(fns, failbreak) {
            var rt = true,
                self = this;
            S.each(fns, function(instance) {
                var fn = instance.fn,
                    args = instance.args || [],
                    context = instance.context || self;
                if(rt && fn.apply(context, args) === false) {
                    rt = false;
                    if(failbreak) {
                        return false;
                    }
                }
            });
            return rt;
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
            config || (config = {});

            if(this._running || this.isDisabled()) return false;

            this.fire('emit', {data: config});
            this._running = true;

            // 校验前执行。若有校验返回值为false，则中断队列执行，中断提交操作。
            if(this._invoke(this._validators, true) === false) {
                this._running = false;
                return;
            }

            // 提交前执行的函数
            // 不在意函数的返回值。也不影响提交操作。
            this._invoke(this._fnBeforeSubmit);

            var cfg = S.merge(this.IOSetup, config);
            if(cfg.url == "" || cfg.url == "about:blank") {
                cfg.url = location.toString();
            }

            if(cfg.async) {
                this._asyncSubmit(cfg);
            }else {
                this._syncSubmit(cfg);
            }

            return true;
        },
        _syncSubmit: function(cfg) {
            var self = this,
                elForm = self.elForm || self._createForm();

            // 如果有新增参数，则构造隐藏域添加到表单中。
            if(cfg.data) {
                var fragment = document.createDocumentFragment();

                S.each(cfg.data, function(val, name) {
                    var el = self._createElement(name, val);
                    fragment.appendChild(el);

                    self._addFieldByElement(el);
                });

                elForm.appendChild(fragment);
            }

            D.attr(elForm, {
                action: cfg.url,
                method: cfg.type
            });

            elForm.submit();
            self._running = false;
        },
        _createElement: function(name, val) {
            var html = S.substitute('<input type="hidden" name="{name}" value="{value}" />', {
                    name: name,
                    value: val
                }),
                el = D.create(html);

            return el;
        },
        _asyncSubmit: function(cfg) {
            var self = this,
                elForm = self.elForm;

            if(elForm) {
                cfg.form = elForm;
            }

            cfg.success = function(data) {
                self.fire('success', {config: cfg, data: data});
            };

//            cfg.complete = function() {
//                self._running = false;
//            };

            cfg.error = function() {
                self.fire('error', {data: cfg});
            };

            IO(cfg);
            self._running = false;
        },
        /**
         * 添加field对象。不允许存在相同的field对象。
         * 传入一个表单元素以及配置。可配置events事件（update、validate）
         */
        _addFieldByElement: function(elem, events) {
            var name = elem.name;

            if(this.getField(name)) return;

            var field = this._takeFieldByElement(elem);

            return this.addField(name, field, events);
        },
        /**
         * 从form表单中获取表单域元素。
         * 然后设置渲染表单域为field对象并返回。
         * @param name
         * @returns {*|boolean|*}
         * @private
         */
        _takeFieldByName: function(name) {
            var elements = this._getOriginElements(name);

            return this._takeFieldByElement(elements);
        },
        _takeFieldByElement: function(element) {
            var elements = makeArrayForElement(element);

            return elements && elements.length > 0 &&
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

            elements = makeArrayForElement(elements);

            return S.filter(S.makeArray(elements), function(element) {
                var tag = element.tagName.toLowerCase();

                return element &&
                    // 过滤掉object元素
                    tag !== "object" &&
                    tag !== "fieldset" &&
                    // 过滤掉id相同但name不同的元素
                    element.getAttribute("name") === name;
            });
        },
        /**
         * 根据元素类型进行渲染。添加到this._fields集合。
         * @param elements {Array|<HTMLElementList>|HTMLElement} HTMLFormElement对象集合。暂只支持相同name且相同类型的元素集合。或单个Form表单元素。
         *
         * <HTMLElementList>不是数组。但可以直接通过makeArray来转换。
         * 但是select元素，通过makeArray转换会变成option集合。不符合需要。
         * issue: https://github.com/kissyteam/kissy/issues/537
         * @private
         */
        _decorateFactory: function(elements) {
            if(!elements || (elements.length !== undefined && !elements[0])) return;

            elements = makeArrayForElement(elements);

            var elTest = elements[0],
                name = elTest && elTest.name,
                type = _getFieldType(elTest);

            if(!type || !name) {
                // object 和 fieldset 这种情况
                return;
            }

            var fieldClass = Formalize.getClass(type);

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
        getClass: function(type) {
            return this._FIELDS[type];
        },
        _FIELDS: {}
    });

    return Formalize;

}, {
    requires: ['dom', 'event', 'ajax']
});

/**
 * @fileoverview 
 * @author 阿克<ake.wgk@taobao.com>
 * @module formalize
 **/
KISSY.add('kg/formalize/2.0.0/index',function (S, D, Formalize) {

    function Field(elems) {
        this.elements = elems;
    }

    S.augment(Field, {
        setValue: function(val) {
            D.val(this.elements, val);
        },
        getValue: function() {

            return D.val(this.elements);
        },
        enable: function() {
            D.prop(this.elements, 'disabled', false);
        },
        disable: function() {
            D.prop(this.elements, 'disabled', true);
        }
    });

    Formalize.addClass('text', Field);

    function CheckboxField(elements) {
        this.elements = elements;
    }

    S.extend(CheckboxField, Field, {
        getValue: function() {
            var rt = [];

            S.each(this.elements, function(elem) {
                var checked = D.prop(elem, 'checked');

                if(checked) {
                    rt.push(D.val(elem));
                }
            });

            return rt;
        },
        setValue: function(values) {
            var vals = S.makeArray(values);

            S.each(this.elements, function(elem) {
                var val = elem.value;

                D.prop(elem, 'checked', S.inArray(val, vals));
            });
        }
    });

    Formalize.addClass('checkbox', CheckboxField);

    function RadioField(elements) {
        this.elements = elements;
    }

    S.extend(RadioField, Field, {
        getValue: function() {
            var val;

            S.each(this.elements, function(elem) {
                if(D.prop(elem, 'checked')) {
                    val = D.val(elem);
                    return false;
                }
            });

            return val;
        },
        setValue: function(value) {
            S.each(this.elements, function(elem) {
                if(D.val(elem) === value) {
                    D.prop(elem, 'checked', true);
                    return false;
                }
            });
        }
    });

    Formalize.addClass('radio', RadioField);

    function SelectField(elements) {
        this.elements = elements;
    }

    S.extend(SelectField, Field, {
        getValue: function() {
            var el = this.elements[0],
                option = el.options[el.selectedIndex];

            return option.value;
        },
        setValue: function(value) {
            var el = this.elements[0],
                options = el.options,
                idx = el.selectedIndex;

            S.each(options, function(option, i) {
                if(D.val(option) === value) {
                    idx = i;
                    return false;
                }
            });

            el.selectedIndex = idx;
        }
    });

    Formalize.addClass('select', SelectField);

    return Formalize;

}, {requires:["dom", "./formalize"]});




