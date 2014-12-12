// Copyright 2011-2013 Proofpoint, Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//  http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//Set of functions for dealing with the lexicon.  Lexicon should already be loaded into PP.lexicon.  this
// is done by this library at the end of the file

if (typeof PP == 'undefined')
{
    Ext.namespace('PP');
    PP.log = function(log)
    {
        if (window.console)
        {
            console.log(log);
        }
    }
}
PP.allowEditing = false;

// below items are for backward compatibility with otehr systems that may load pp_lexicon.js
PP.url = PP.config.cmdb_api_path + 'system/';
PP.editors = new Object;
PP.entities = {};
PP.user = {
    username: 'test',
    password: 'test'
};

// this will be deprecated as reserved words are moved to being prefixed with _
PP.lexicon_reserved_words = [
    'key',
    'flavor',
    'fact',
    'label',
    'required',
    'maps_to',
    'field_categories',
    'extends',
    'field_category',
    'field_order',
    'format',
    'validation',
    'enumeration',
    '#text',
    '#comment'
]


PP.saveRecord = function(r)
{
    r.save();
    r.commit();
}

// parses lexicon to return the key field for an entity
PP.getEntityKey = function(entity)
{
    if (PP.entities[entity] != undefined)
    {
        return PP.entities[entity]._key;
    }
}


// parses lexicon for entity and returns array of field names for that entity
PP.getEntityFields = function(entity)
{
    if (PP.entities._field_order != undefined)
    {
        if (PP.entities._field_order.match(',') != null)
        {
            var field_order = PP.entities._field_order.split(',');
        }
    }
    var fieldlist = [];
    if (typeof PP.entities[entity] == 'object')
    {
        var field_order = PP.entities[entity]._field_order;
        var entity_fieldlist = Object.keys(PP.entities[entity]);
        for (var i = 0; i < entity_fieldlist.length; i++)
        {
            if (!entity_fieldlist[i].match(/^_/) && PP.lexicon_reserved_words.indexOf(entity_fieldlist[i]) == -1)
            {
                fieldlist.push(entity_fieldlist[i]);
            }
        }
        return fieldlist.sort(function(a, b)
        {
            if (field_order && field_order.length &&
                (field_order.indexOf(a) > -1 ||
                    field_order.indexOf(b) > -1)
            )
            {
                var idx_a = 99999,
                    idx_b = 99999;
                if (field_order.indexOf(a) > -1) idx_a = field_order.indexOf(a);
                if (field_order.indexOf(b) > -1) idx_b = field_order.indexOf(b);
                if (idx_a < idx_b) return -1;
                if (idx_a > idx_b) return 1;
                return 0;
            }
            else
            {
                if (PP.getFieldLabel(a, entity) < PP.getFieldLabel(b, entity)) return -1;
                if (PP.getFieldLabel(a, entity) > PP.getFieldLabel(b, entity)) return 1;
                return 0;
            }
        });
    }
    else
    {
        PP.log('failed to get fields for ' + entity);
    }
}

// parses lexicon to find label attribute for field.  returns fieldname if no label is found
PP.getFieldLabel = function(field, entity)
{
    var labellkup;
    entity = entity || 'system';
    if (field == '' || field == undefined)
    {
        return '';
    }
    if (PP.entities[entity] && PP.entities[entity][field])
    {
        return PP.entities[entity][field]._label || field;
    }
}

// returns text/combo/textarea editor config  based on whether lexicon defines an enumerator
PP.getEditorConfig = function(editor_name, opts)
{

    if (!opts || !opts.entity)
    {
        PP.log('PP.getEditorConfig called without "opts"');
        return;
        // return 'textfield';
    }
    if (typeof opts.labels == 'undefined')
    {
        opts.labels = true;
    }
    if (!PP.editors)
    {
        PP.editors = {};
    }

    if (typeof PP['customEditors'] != 'undefined' && typeof PP['customEditors'][editor_name] == 'function')
    {
        return PP['customEditors'][editor_name].call(null, editor_name, opts);
    }
    if (PP.editors[editor_name] && false)
    {
        //PP.log('editor already built');
    }
    else
    {
        //PP.log('check lexicon for ' + sel);
        if (!Ext.ModelManager.getModel('enumerator'))
        {
            Ext.define('enumerator',
            {
                extend: 'Ext.data.Model',
                fields: [
                {
                    name: 'value',
                    mapping: '/'
                }]
            });
        }
        if (!Ext.ModelManager.getModel('arraymenu'))
        {
            Ext.define('arraymenu',
            {
                extend: 'Ext.data.Model',
                fields: [
                {
                    name: 'value',
                    mapping: '0'
                }]
            });
        }
        if (!Ext.ModelManager.getModel('roles'))
        {
            Ext.define('roles',
            {
                extend: 'Ext.data.Model',
                fields: ['role_id', 'role_name']
            });
        }
        if (PP.entities[opts.entity][editor_name] != undefined && PP.entities[opts.entity][editor_name]._enumeration != undefined)
        {
            PP.editors[editor_name] = { //new Ext.form.ComboBox({
                xtype: 'combo',
                name: editor_name,
                multiSelect: (PP.entities[opts.entity][editor_name]._format == 'multiselect' ? true : false),
                fieldLabel: (opts.labels ? PP.getFieldLabel(editor_name) : undefined),
                displayField: 'value',
                forceSelection: ( PP.entities[opts.entity][editor_name]._enumeration['forceselect'] == 'false' ? false : true),
                store: PP.entities[opts.entity][editor_name]._enumeration.enumerator,
                listeners:
                {
                    focus: function(f)
                    {
                        f.onTriggerClick();
                    }
                },
                queryMode: 'local',
                typeAhead: (PP.entities[opts.entity][editor_name]._format == 'multiselect' ? false : true),
                editable: true,
                selectOnFocus: true,
                triggerAction: 'all'
            }; //);
            PP.log('made enumarated combo for ' + editor_name);

        }
        else
        {
            if (PP.entities[opts.entity][editor_name] && PP.entities[opts.entity][editor_name]._format == 'text')
            {
                PP.editors[editor_name] = { //new Ext.form.TextArea({
                    xtype: 'textarea',
                    fieldLabel: (opts.labels ? PP.getFieldLabel(editor_name) : undefined),
                    name: editor_name,
                    selectOnFocus: true
                }; 
            }
  
            else
            {
                PP.editors[editor_name] = { //new Ext.form.TextField({
                    xtype: 'textfield',
                    fieldLabel: (opts.labels ? PP.getFieldLabel(editor_name) : undefined),
                    name: editor_name,
                    selectOnFocus: true
                }; //);
            }
        }
    }
    if (PP.entities[opts.entity][editor_name] && PP.entities[opts.entity][editor_name]._flavor == 'fact' && PP.entities[opts.entity][editor_name]._format != 'text')
    {
        PP.editors[editor_name].xtype = 'displayfield';
        PP.editors[editor_name].fieldBodyCls = 'cmdb_display_field';
        PP.editors[editor_name].submitValue = false;
    }
    //PP.log(PP.editors[editor_name]);
    return PP.editors[editor_name];
}

PP.make_entity_model_config = function(ent)
{
    if (typeof PP.entities[ent] != 'object' || PP.entities[ent] == null || Object.keys(PP.entities[ent]).length == 0)
    {
        return;
    }
    var model = {
        name: ent
    };
    var fields = [];

    Ext.each(Object.keys(PP.entities[ent]), function(f)
    {
        if (f.match(/^_/)  ||  PP.lexicon_reserved_words.indexOf(f) > -1)
        {
            return;
        }
        if (f == 'roles')
        {
            fields.push(
            {
                name: f,
                convert: function(v)
                {
                    if (v && typeof v == 'string')
                    {
                        return v.replace(/\ /g, '').split(',');
                    }
                    else
                    {
                        return v;
                    }
                }
            });
            return;
        }
        fields.push(
        {
            name: f,
            //TODO need to add better type handling/detection to support validaters and formartters
            type: PP.entities[ent][f].type == 'date' ? 'date' : undefined
        });

    });
    model.fields = fields;
    model.extend = 'Ext.data.Model';
    model.idProperty = PP.entities[ent]._key;
    model.validations = [
    {
        field: model.idProperty,
        type: 'length',
        min: 1
    }];
    model.proxy = {
        type: 'rest',
        startParam: undefined,
        pageParam: undefined,
        limitParam: undefined,
        sortParam: undefined,
        filterParam: undefined,
        url: PP.config.cmdb_api_path + model.name,
        reader:
        {
            type: 'json',
            messageProperty: 'message'
        },
        listeners:
        {
            exception: function(proxy, response, operation)
            {
                if (operation)
                {
                    if (operation['error'] && operation['error']['status'])
                        Ext.Msg.alert("Remote Object Error: " + model.name, operation.error.status + ": " + operation.error.statusText);
                }
                else
                {
                    // May be a proxy error...
                }
            }
        }
    };
    if (model.name == 'system')
    {
        model.fields.push('changes');
    }
    return model;
}

// parses lexicon and sets up models for each entity
PP.lexicon_load = function(config)
{

    Ext.each(Object.keys(PP.entities), function(ent)
    {
        var model = PP.make_entity_model_config(ent);
        Ext.define(model.name, model);
    });
    PP.log('lexicon loaded');
}


// Load the lexicon as JS from the API syncronously

var url = PP.config.cmdb_api_path,
    xhr, status, onScriptError;

url += '?help=1&lexicon=1';

if (typeof XMLHttpRequest !== 'undefined')
{
    xhr = new XMLHttpRequest();
}
else
{
    xhr = new ActiveXObject('Microsoft.XMLHTTP');
}

xhr.open('GET', url, false);
xhr.send(null);

status = (xhr.status === 1223) ? 204 : xhr.status;

if (status >= 200 && status < 300)
{

    var lexicon_raw = Ext.decode(xhr.responseText);
    var entity_list = Object.keys(lexicon_raw);
    for (var e = 0; e < entity_list.length; e++)
    {
        if (typeof lexicon_raw[entity_list[e]] == 'object' && lexicon_raw[entity_list[e]] != null && Object.keys(lexicon_raw[entity_list[e]]).length)
        {
            var entity_definition = lexicon_raw[entity_list[e]];
            if (entity_definition && entity_definition['_extends'] != undefined)
            {
                var extended_from = entity_definition['_extends'].split('/')[entity_definition['_extends'].split('/').length - 1];
                Ext.apply(entity_definition, lexicon_raw[extended_from]);
            }
            PP.entities[entity_list[e]] = entity_definition;
        }
    }
    PP.lexicon_load();
}
else
{
    onError.call(this, "Failed loading synchronously via XHR: '" + url + "'; please " +
        "verify that the file exists. " +
        "XHR status code: " + status);
}

// Load the user info syncronously

var userurl = PP.config.cmdb_api_path + 'currentUser/' + PP.currentUser,
    fileName = userurl.split('/').pop(),
    xhr, status, onScriptError;

if (typeof XMLHttpRequest !== 'undefined')
{
    xhr = new XMLHttpRequest();
}
else
{
    xhr = new ActiveXObject('Microsoft.XMLHTTP');
}

xhr.open('GET', userurl, false);
xhr.send(null);

status = (xhr.status === 1223) ? 204 : xhr.status;

if (status >= 200 && status < 300)
{

    var lkup = Ext.decode(xhr.responseText);
    if (typeof(lkup) != null && typeof(lkup['writeaccess']) != 'undefined' && (lkup.writeaccess == 'true' || lkup.writeaccess == true || lkup.writeaccess == 1))
    {
        PP.allowEditing = true;
    }
    if (!PP.currentUser || lkup.username != null)
    {
        PP.currentUser = lkup.username;
        PP.user = lkup;
    }
}
else
{
    onError.call(this, "Failed loading user info via XHR: '" + userurl + "'; " +
        "XHR status code: " + status);
}