if (typeof PP['customEditors'] == 'undefined')
{
    PP.customEditors = {};
}

PP.customEditors.config_agent_classes = function(editor_name, opts)
{
    PP.editors[editor_name] = {
        xtype: 'displayfield',
        name: editor_name,
        renderer: function(v, f)
        {
            var rtn = '';
            var classes = v.split(',');
            Ext.each(classes, function(c)
            {
                rtn += " <a target='_blank' href='" + PP.config.puppet_class_browser + "?class=" + c + "'>" + c + "</a> ";
            });
            return rtn;
        },
        fieldBodyCls: 'cmdb_puppet_classes_field',
        fieldLabel: ((opts && opts.labels) ? PP.getFieldLabel(editor_name) : undefined),
        submitValue: false
    };
    return PP.editors[editor_name];
}