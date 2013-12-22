/**
 * @fileoverview 
 * @author 阿克<ake.wgk@taobao.com>
 * @module formalize
 **/
KISSY.add(function (S, Node,Base) {
    var EMPTY = '';
    var $ = Node.all;
    /**
     * 
     * @class Formalize
     * @constructor
     * @extends Base
     */
    function Formalize(comConfig) {
        var self = this;
        //调用父类构造函数
        Formalize.superclass.constructor.call(self, comConfig);
    }
    S.extend(Formalize, Base, /** @lends Formalize.prototype*/{

    }, {ATTRS : /** @lends Formalize*/{

    }});
    return Formalize;
}, {requires:['node', 'base']});



