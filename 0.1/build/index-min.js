/*!build time : 2014-02-27 3:43:27 PM*/
KISSY.add("gallery/formalize/0.1/formalize",function(a,b,c,d){function e(b){if(b){var c=b;return b.tagName&&"select"===b.tagName.toLowerCase()&&(c=[b]),a.makeArray(c)}}function f(c){if(c){var d,e=c.tagName.toLowerCase(),f=b.attr(c,"type");if(!a.inArray(e,m))return d="input"==e?a.inArray(f,l)?f:a.inArray(f,i)?"button":"text":"textarea"==e?"text":e}}function g(b){return a.every(n,function(c){var d=b[c];return d&&a.isFunction(d)})}function h(){this._init.apply(this,arguments)}var i=["button","submit","image","reset"],j=["radio","checkbox"],k=["file"],l=j.concat(k),m=["object","fieldset"],n=["getValue","setValue","disable","enable"],o={async:!0,validate:!0},p={type:"get",dataType:"json"};return a.augment(h,a.EventTarget,{_init:function(b){var c=a.merge(o,b);c.io&&(this.IOSetup=a.merge(p,c.io),delete c.io),this.cfg=c,this._disableMap={},this.disabled=!1,this._fields={},this._validators=[],this._fnBeforeSubmit=[]},attach:function(c,d){var e=this,g=b.get(c),h=b.attr(g,"action");this.elForm=g,this.IOSetup=a.merge(p,{url:h,type:b.attr(g,"method")}),a.each(this._fields,function(a,b){var c=e._takeFieldByName(b);c&&(a.field=c)}),d&&a.each(c.elements,function(a){var b=f(a);if(b){var c=a.getAttribute(c),d=e._fields[c];d||e._takeFieldByName(c)}})},getField:function(a){var b=this,c=b._fields[a];return c?c.field:b._takeFieldByName(a)},setField:function(b,c,d){var e=this;e._attachField(b,c),a.each(d,function(a,c){e._attachEvents(b,c,a)})},addField:function(a,b,c){return b&&g(b)?(this.setField(a,b,c),b):void 0},setValue:function(a,b){var c=this.getField(a);c&&c.setValue(b)},getValue:function(a){var b=this.getField(a);return b&&b.getValue()},fieldDisable:function(a){var b=this.getField(a);b&&b.disable()},fieldEnable:function(a){var b=this.getField(a);b&&b.enable()},disable:function(a){var b=this._disableMap;b[a]=!0,this.disabled||this._disable(!0)},enable:function(b){var c=this._disableMap,d=!0;delete c[b],a.each(c,function(a){return a?(d=!1,!1):void 0}),d&&this.disabled&&this._disable(!1)},getReasons:function(){return this._disableMap},isDisabled:function(){return this.disabled},_disable:function(a){this.disabled=a,this.fire("disabled")},beforeSubmit:function(b,c,d){!c||d||a.isArray(c)||(c=[],d=c),this._fnBeforeSubmit.push({fn:b,args:c,context:d})},onValidate:function(b,c,d){!c||d||a.isArray(c)||(c=[],d=c),this._validators.push({fn:b,args:c,context:d})},_invoke:function(b,c){var d=!0,e=this;return a.each(b,function(a){var b=a.fn,f=a.args||[],g=a.context||e;return d&&b.apply(g,f)===!1&&(d=!1,c)?!1:void 0}),d},submit:function(b,c){if(b||(b={}),this._running||this.isDisabled())return!1;if(this.fire("emit",{data:b}),this._running=!0,!c){if(this._invoke(this._validators,!0)===!1)return this._running=!1,void 0;this._invoke(this._fnBeforeSubmit)}var d=a.merge(this.IOSetup,b);return(""==d.url||"about:blank"==d.url)&&(d.url=location.toString()),d.async?this._asyncSubmit(d):this._syncSubmit(d),!0},_syncSubmit:function(c){var d=this,e=d.elForm||d._createForm();if(c.data){var f=document.createDocumentFragment();a.each(c.data,function(a,b){var c=d._createElement(b,a);f.appendChild(c),d._addFieldByElement(c)}),e.appendChild(f)}b.attr(e,{action:c.url,method:c.type}),e.submit(),d._running=!1},_createElement:function(c,d){var e=a.substitute('<input type="hidden" name="{name}" value="{value}" />',{name:c,value:d}),f=b.create(e);return f},_asyncSubmit:function(a){var b=this,c=b.elForm;c&&(a.form=c),a.success=function(c){b.fire("success",{config:a,data:c})},a.error=function(){b.fire("error",{data:a})},d(a),b._running=!1},_addFieldByElement:function(a,b){var c=a.name;if(!this.getField(c)){var d=this._takeFieldByElement(a);return this.addField(c,d,b)}},_takeFieldByName:function(a){var b=this._getOriginElements(a);return this._takeFieldByElement(b)},_takeFieldByElement:function(a){var b=e(a);return b&&b.length>0&&this._decorateFactory(b)},_getOriginElements:function(b){var c=this.elForm;if(c){var d=c.elements[b];if(d)return d=e(d),a.filter(a.makeArray(d),function(a){var c=a.tagName.toLowerCase();return a&&"object"!==c&&"fieldset"!==c&&a.getAttribute("name")===b})}},_decorateFactory:function(a){if(a&&(void 0===a.length||a[0])){a=e(a);var b=a[0],c=b&&b.name,d=f(b);if(d&&c){var g=h.getClass(d);if(g){var i=new g(a);return this._attachField(c,i),i}}}},_attachField:function(a,b){var c=this._makeFieldMap(a);return c.field=b,c},_attachEvents:function(a,b,c){var d=this._makeFieldMap(a),e=d.events[b];return e&&e.push(c),d},_makeFieldMap:function(a){var b=this._fields[a];return b||(b=this._fields[a]={field:void 0,events:{update:[],validate:[]}}),b},_createForm:function(){var a=b.create("<form></form>");return document.body.append(a),a}}),a.mix(h,{addClass:function(a,b){var c=this._FIELDS[a];if(c)throw new Error("exists Field Class");this._FIELDS[a]=b},getClass:function(a){return this._FIELDS[a]},_FIELDS:{}}),h},{requires:["dom","event","ajax"]}),KISSY.add("gallery/formalize/0.1/index",function(a,b,c){function d(a){this.elements=a}function e(a){this.elements=a}function f(a){this.elements=a}function g(a){this.elements=a}return a.augment(d,{setValue:function(a){b.val(this.elements,a)},getValue:function(){return b.val(this.elements)},enable:function(){b.prop(this.elements,"disabled",!1)},disable:function(){b.prop(this.elements,"disabled",!0)}}),c.addClass("text",d),a.extend(e,d,{getValue:function(){var c=[];return a.each(this.elements,function(a){var d=b.prop(a,"checked");d&&c.push(b.val(a))}),c},setValue:function(c){var d=a.makeArray(c);a.each(this.elements,function(c){var e=c.value;b.prop(c,"checked",a.inArray(e,d))})}}),c.addClass("checkbox",e),a.extend(f,d,{getValue:function(){var c;return a.each(this.elements,function(a){return b.prop(a,"checked")?(c=b.val(a),!1):void 0}),c},setValue:function(c){a.each(this.elements,function(a){return b.val(a)===c?(b.prop(a,"checked",!0),!1):void 0})}}),c.addClass("radio",f),a.extend(g,d,{getValue:function(){var a=this.elements[0],b=a.options[a.selectedIndex];return b.value},setValue:function(c){var d=this.elements[0],e=d.options,f=d.selectedIndex;a.each(e,function(a,d){return b.val(a)===c?(f=d,!1):void 0}),d.selectedIndex=f}}),c.addClass("select",g),c},{requires:["dom","./formalize"]});