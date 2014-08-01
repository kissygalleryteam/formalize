/**
 * @fileoverview 
 * @author 阿克<ake.wgk@taobao.com>
 * @module formalize
 **/
KISSY.add(function (S, D, Formalize) {

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



