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


if (typeof PP == 'undefined') {
    Ext.namespace('PP');
    PP.log = function(log) {
        if (window.console) {
            console.log(log);
        }
    }
    PP.notify = function() {
        var msgCt;

        function createBox(t, s) {
            return '<div class="msg"><h3>' + t + '</h3><p>' + s + '</p></div>';
        }
        return {
            msg: function(title, format) {
                if (!msgCt) {
                    msgCt = Ext.core.DomHelper.insertFirst(document.body, {
                        id: 'msg-div'
                    }, true);
                }
                var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
                var m = Ext.core.DomHelper.append(msgCt, createBox(title, s), true);
                m.hide();
                m.slideIn('t').ghost("t", {
                    delay: 1000,
                    remove: true
                });
            },

            init: function() {}
        };
    }();
}

Ext.define('PP.EntityEditorGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.entityeditorgrid',
    lexicon: PP.lexicon,
    baseurl: PP.config.cmdb_api_path,
    mode: 'editor',
    selType: 'rowmodel',
    // plugins: [
    //         Ext.create('Ext.grid.plugin.CellEditing', {
    //             clicksToEdit: 2
    //         })
    //     ],

    chooser_select: 'single',
    chooser_buttonText: 'Use Selection',
    chooser_callback: function() {},
    chooser_callbackdata: false,
    save_callback: function() {},
    //	fields:false,
    search: true,
    border: true,
    rec_template: false,
    scratch: {},
    colSizes: {},
    deleteEnabled: false,
    hideKeyField: false,
    // columns:[],
    // hiddenColumns
    columnConfig: function(field) {
        return {
            header: PP.getFieldLabel(field, this.entity),
            dataIndex: field,
            flex: 1,
            width: (this.colSizes[field] ? this.colSizes[field] : undefined),
            editor: PP.getEditorConfig(field, {
                entity: this.entity,
                labels: false
            }),
            hidden: (this.hideKeyField && field == this.entityKey ? true : false)

        };
    },
    deleteColumnRenderer: function(v, meta, rec) {
        return '<span style="font-size:10px;cursor: pointer;color:#666;" onclick="Ext.getCmp(\'' + this.getId() + '\').deleteRecord(\'' + rec.getId() + '\');">Delete</span> ';
    },
    initComponent: function() {
        this.model = this.entity;
        this.entityKey = PP.getEntityKey(this.entity);
        this.url = this.baseurl + this.entity + '/';
        this.fields = PP.getEntityFields(this.entity);
        this.fieldAndLabels = [];
        if (!this.columns) {
            this.columns = [];
            Ext.each(this.fields, function(ff) {
                this.columns.push(this.columnConfig(ff));
            }, this);
        }
        Ext.each(this.fields, function(ff) {
            this.fieldAndLabels.push([ff, PP.getFieldLabel(ff, this.entity)]);
        }, this);

        if (this.deleteEnabled) {
            this.columns.push({
                header: '',
                dataIndex: 'id',
                renderer: this.deleteColumnRenderer,
                flex: 0,
                width: 47
            });
        }
        if (this.mode == 'editor') {
            var me = this;
            this.plugins = [
                Ext.create('Ext.grid.plugin.RowEditing', {
                    clicksToEdit: 2,
                    autoCancel: false,
                    listeners: {
                        beforeedit: {
                            fn: function(ed, e) {
                                return PP.allowEditing;
                            }
                        },
                        cancelEdit: function(rowEditing, context) {
                            // Canceling editing of a locally added, unsaved record: remove it
                            if (context.record.phantom) {
                                me.store.remove(context.record);
                            }
                        },
                        // canceledit: {
                        // 	fn: function(ed,e,o)
                        // 	{
                        // 		if(e.record.getId() == '' && e.record.phantom)
                        // 		{
                        // 			e.store.remove(e.record);
                        // 		}
                        // 	}
                        // },
                        edit: {
                            fn: function(ed, e) {
                                // if(PP.allowEditing && (e.record.dirty || e.record.phantom))
                                // {
                                // 	e.record.phantomMark=false;
                                // 	if(e.record.phantom)
                                // 	{
                                // 		e.record.phantomMark=true;
                                // 	}
                                // 	if(!e.record.isValid() && !e.grid.hideKeyField )
                                // 	{
                                // 		return false;
                                // 	}
                                // 	e.record.save({
                                // 		success: function(rec,e){
                                // 			PP.notify.msg('Success', 'Record saved');
                                // 			if(rec.phantomMark)
                                // 			{
                                // 				me.store.reload();												
                                // 			}
                                // 			// this.commit();
                                // 		},
                                // 		failure:function(recs,op,success){
                                // 			if(!op.success)
                                // 			{
                                // 				Ext.Msg.alert("Error",'Server returned ' + op.error.status + ": " + op.error.statusText + "<br>" + op.response.responseText);
                                // 				// this.reject();
                                // 			}
                                // 		},
                                // 		scope: e.record
                                // 	});
                                // }
                            },
                            scope: this
                        }
                    }
                })
            ]
        }

        // this.columns[0].renderer = this.renderSave;
        // setup for object as selector
        if (this.mode == 'chooser') {
            if (!this.sm) {
                if (this.chooser_select == 'multiple') {
                    // this.sm= new Ext.grid.RowSelectionModel({singleSelect:false});				

                } else {
                    // this.sm= new Ext.grid.RowSelectionModel({singleSelect:true});				
                }
            }
            this.tbarButton = new Ext.Button({
                // use selections
                scope: this,
                text: this.chooser_buttonText,
                handler: this.buttonHandler
            });
        }
        // setup for object as editor
        else {
            if (!this.sm) {
                // this.sm= new Ext.grid.RowSelectionModel({singleSelect:true});				
            }
            this.tbarButton = new Ext.Button({
                // Create new record
                scope: this,
                text: 'New Entry',
                handler: this.buttonHandler
            });
        }
        this.filtertype = new Ext.form.ComboBox({
            listeners: {
                'expand': function(c) {
                    c.store.clearFilter();
                },
                focus: function(f) {
                    f.onTriggerClick();
                }
            },
            name: 'filtertype',
            //id: 'filtertype',
            mode: 'local',
            value: this.startQuerytype || this.fields[0],
            store: this.fieldAndLabels
        });
        this.filter = new Ext.form.TriggerField({
            name: 'filter',
            //id: 'filter',
            triggerCls: 'x-form-search-trigger',
            instance: this,
            onTriggerClick: function(f, e) {
                this.instance.doQuery();
            },
            listeners: {
                'specialkey': function(f, e) {
                    if (e.getKey() == e.ENTER) {
                        this.onTriggerClick();
                    }
                }
            }
        });
        // this.filter.onTriggerClick= function(f,e)
        // 	{
        // 		this.instance.doQuery();
        // 	}	
        if (!this.store) {
            this.store = new Ext.data.Store({
                model: this.model,
                instance: this,
                autoLoad: false,
                autoSync: true
            });
        }

        if (!this.tbar && this.search) {
            this.tbar = [
                'Search by ', {
                    xtype: 'tbspacer'
                },
                this.filtertype, {
                    xtype: 'tbspacer'
                },
                // Search bar and fields
                this.filter, {
                    xtype: 'tbspacer'
                },
                this.tbarButton, {
                    xtype: 'tbfill'
                },
                // total records display
                {
                    xtype: 'panel',
                    // id: 'totaldiplay',
                    bodyStyle: 'text-align:right;'
                }

            ];
        }
        PP.EntityEditorGrid.superclass.initComponent.call(this);
        if (this.mode == 'chooser') {
            this.on('beforeedit',
                function(e) {
                    return false;
                });
            if (this.chooser_select != 'multiple') {
                this.on('rowdblclick', this.buttonHandler);
            }
        }
        if (this.startQuery) {
            this.on('render', function() {
                if (this.startQuery) {
                    this.filter.setValue(this.startQuery);
                    this.doQuery();
                }
            }, this, {
                scope: this,
                single: true
            });
        }
        // PP.log(this.fields);
    },
    renderSave: function(value, o, r, row, col, store) {
        return (store.getAt(row).dirty && PP.allowEditing) ? '<span style="cursor: pointer;text-decoration:underline;color:blue;" onclick="Ext.getCmp(\'' + store.instance.id + '\').saveRecord();">Save</span> ' + value : value;

    },
    deleteRecord: function(id) {
        if (this.store.getById(id)) {

            Ext.Msg.confirm('Confirm', 'Are you sure you want to delete this record?<br>This cannot be undone', function(btn) {
                if (btn == 'yes') {
                    var rec = this.store.getById(id);
                    this.store.remove(rec);
                    rec.destroy({
                        success: function() {
                            PP.notify.msg('Success', 'Record deleted');
                        },
                        failure: function() {
                            Ext.Msg.alert('Error', 'There was an error deleting the record in the remote store');
                        }
                    });
                }
            }, this);
        }
    },
    doQuery: function(q, o) {
        var params = new Object();
        if (typeof q == 'object') {
            this.filtertype.setValue(q.filtertype);
            this.filter.setValue(q.filter);
        }
        if (o) {
            params = o;
        } else {
            params[this.filtertype.getValue()] = '*' + this.filter.getValue() + '*';
        }
        this.store.load({
            params: params
        });
    },
    // storeRecord:function(rec){
    // 	var key_field=rec.get(this.keyfield);
    // 	if(typeof rec.modified[this.keyfield] !='undefined')
    // 	{
    // 		key_field=rec.modified[this.keyfield];
    // 	}
    // 
    // 	Ext.Ajax.request({
    //         url: rec.phantom ? this.url: this.url + key_field,
    //         method: rec.phantom ? 'POST': 'PUT',
    //         jsonData: rec.getChanges(),
    //         record: rec,
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         failure: function(r) {
    //             Ext.Msg.alert('Error', 'There was an error saving your data:<br> ' + r.responseText);
    //         },
    //         success: function(r, o) {
    // 			delete o.record.phantom;
    // 			o.record.commit();
    // 		}
    // 	});
    // },
    // saveRecord:function(){
    // 	if(PP.allowEditing)
    // 	{
    // 		var rec=this.getSelectionModel().getSelected();
    // 		this.storeRecord(rec);
    // 	}
    // },
    buttonHandler: function(b) {
        if (!PP.allowEditing) {
            //	return;
        }
        if (this.mode == 'chooser') {
            var data = new Array();
            var fields;
            if (this.chooser_callbackdata) {
                fields = this.chooser_callbackdata;
            } else {
                fields = new Array();
                for (i in this.fields) {
                    if (typeof fields[i] == 'function') {
                        continue;
                    }
                    fields.push(this.fields[i][0]);
                }
            }
            var recs = this.getSelectionModel().getSelections();
            for (r in recs) {
                if (typeof recs[r] == 'function') {
                    continue;
                }
                var entry = new Object();
                for (i in fields) {
                    if (typeof fields[i] == 'function') {
                        continue;
                    }
                    entry[fields[i]] = recs[r].get(fields[i]);
                }
                data.push(entry);
            }
            this.chooser_callback(data);
            if (this.chooser_closeonselect) {

            }
        } else {
            var p = Ext.ModelManager.create({}, this.entity);
            if (this.rec_template) {
                PP.log(this.rec_template);
                for (i in this.rec_template) {
                    if (typeof this.rec_template[i] == 'function') {
                        p.set(i, this.rec_template[i](this));
                        continue;
                    }
                    p.set(i, this.rec_template[i]);
                }
            }
            this.store.insert(0, p);
            this.editingPlugin.startEdit(p, this.columns[0]);
        }
    }


});