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

Ext.define('PP.EnvironmentServicesProxy',
{
    extend: 'Ext.data.proxy.Rest',
    alias: 'proxy.environmentservices',
    reader:
    {
        type: 'json'
    },
    // this function must be overridden to provide a way for the proxy to fetch services
    // for the correct environment
    getEnvironment: function()
    {
        return PP.config.defaultEnvironment;
    },
    // custom buildUrl to assemble url for services based on enviroment
    buildUrl: function(request)
    {
        var me = this;
        var url = me.getUrl(request);
        url = PP.config.cmdb_api_path + 'environments/' + this.getEnvironment() + '/services';
        request.url = url;
        return PP.EnvironmentServicesProxy.superclass.buildUrl.call(this, request);
    }
});

// construct special environmentservice model to use with environments api
var envsvc_config = PP.make_entity_model_config('service_instance');
envsvc_config.idProperty = 'name';
envsvc_config.proxy = {
    type: 'environmentservices',
    getEnvironment: function()
    {
        if (this.selectedEnvironment)
        {
            return this.selectedEnvironment.get('name');
        }
        return this.defaultEnvironment;
    },
    filterParam: undefined,
    groupParam: undefined,
    groupDirectionParam: undefined,
    limitParam: undefined,
    pageParam: undefined,
    sortParam: undefined,
    startParam: undefined
}
envsvc_config.proxy = {
    type: 'environmentservices',
    filterParam: undefined,
    groupParam: undefined,
    groupDirectionParam: undefined,
    limitParam: undefined,
    pageParam: undefined,
    sortParam: undefined,
    startParam: undefined
};


Ext.define('environmentservice_mod', envsvc_config);



Ext.define('PP.EnvironmentServices',
{
    extend: 'PP.EntityEditorGrid',
    alias: 'widget.environmentservices',
    entity: 'environmentservice',
    startQuery: '*',
    hideKeyField: false,
    stateful: false,
    defaultEnvironment: false,
    startQuery: false,
    deleteEnabled: true,
    viewConfig:
    {
        getRowClass: function(rec, indx, dep, store)
        {
            if (rec.get('environment_name') != Ext.getCmp('service_grid').selectedEnvironment.get('name'))
            {
                return 'inherited';
            }
        },
        loadMask: true
    },
    rec_template:
    {
        environment_name: function(me)
        {
            return me.selectedEnvironment.get('name');
        },
        type: 'service'
    },
    lookup_store: new Ext.data.Store(
    {
        model: 'environmentservice',
        proxy:
        {
            type: 'environmentservices'
        },
        autoLoad: false,
        listeners:
        {
            load: function()
            {
                this.filterBy(function(record, id)
                {
                    return (record.get('type') != 'environment') ? true : false;
                });
            }
        }
    }),
    env_store: new Ext.data.Store(
    {
        model: 'environments',
        storeId: 'env_lookup_store',
        autoLoad: true,
        listeners:
        {
            load: function()
            {
                this.filterBy(function(record, id)
                {
                    return (record.get('type') == 'environment') ? true : false;
                });
            }
        }
    }),
    listeners:
    {
        // if double clicking on a record that is not in the environment prompt to create override service record
        beforeedit: function(cmp, e, ed, opts)
        {
            if (e.record.get('environment_name') != e.grid.selectedEnvironment.get('name'))
            {
                Ext.Msg.show(
                {
                    title: 'Create Override?',
                    msg: 'An override service in your environment will allow you to define different service settings',
                    buttons: Ext.Msg.YESNO,
                    icon: Ext.Msg.QUESTION,
                    fn: function(btn)
                    {
                        if (btn == 'yes')
                        {
                            // create a override service record for this environment, take values from parent service record
                            // then add it, remove the parent (so its not shown) save it and reload so it can be edited
                            var p = Ext.ModelManager.create(
                            {
                                type: e.record.get('type'),
                                name: e.record.get('name'),
                                note: e.record.get('note'),
                                environment_name: this.selectedEnvironment.get('name')
                            }, 'service_instance');
                            this.store.insert(0, p);
                            p.save(
                            {
                                callback: function()
                                {
                                    this.loadEnvironment(this.selectedEnvironment.get('name'));
                                },
                                scope: this
                            });
                        }
                    },
                    scope: this
                });
                return false;
            }
        },
        edit: function(e, ed, p, record)
        {
            var rec = e.grid.getSelectionModel().getLastSelected();
            //assign the store proxy to the model, since it knows how to handle the url construction
            // for the REST endpoint
            rec.setProxy(this.store.getProxy());
            if (ed.originalValues.svc_id != null)
            {
                e.context.record.set('svc_id', ed.originalValues.svc_id);
                e.context.record.commit();
            }
            e.context.record.save(
            {
                success: function()
                {
                    this.selectedService = e.context.record.get('name');
                    e.context.record.commit();
                    PP.notify.msg('Success', 'Record saved');
                    this.store.removeAt(e.context.rowIdx);
                    e.grid.loadEnvironment(e.grid.selectedEnvironment.get('name'));
                },
                failure: function(rec1, op, success)
                {
                    if (!op.success)
                    {
                        Ext.Msg.alert("Error", 'Server returned ' + op.error.status +
                            ": " + op.error.statusText + "<br>" + op.response.responseText);
                        rec.reject();
                    }
                },
                scope: this
            }); //record.save

        }, //edit::funtion
        afterrender: function()
        {
            if (this.defaultEnvironment)
            {
                this.loadEnvironment(this.defaultEnvironment);
            }
        }
    },
    deleteRecord: function(id)
    {
        if (this.store.getById(id))
        {

            Ext.Msg.confirm('Confirm', 'Are you sure you want to delete this record?<br>This cannot be undone', function(btn)
            {
                if (btn == 'yes')
                {
                    var rec = this.store.getById(id);
                    this.store.remove(rec);
                    //assign the store proxy to the model, since it knows how to handle the url construction
                    // for the REST endpoint
                    rec.setProxy(this.store.getProxy());
                    rec.destroy(
                    {
                        success: function()
                        {
                            this.loadEnvironment(this.selectedEnvironment.get('name'));
                            PP.notify.msg('Success', 'Record deleted');

                        },
                        failure: function()
                        {

                            Ext.Msg.alert('Error', 'There was an error deleting the record in the remote store: <br> ' + op.response.responseText);
                        },
                        scope: this
                    });
                }
            }, this);
        }
    },
    deleteColumnRenderer: function(v, meta, rec)
    {
        if (rec.get('environment_name') == Ext.getCmp('service_grid').selectedEnvironment.get('name'))
        {
            return '<span style="font-size:10px;cursor: pointer;color:#666;" onclick="Ext.getCmp(\'' + this.getId() + '\').deleteRecord(\'' + rec.getId() + '\');">Delete</span> ';
        }
    },
    setLineage: function(env)
    {
        this.lineage = [];
        this.env_store.clearFilter();
        var environ = this.env_store.findRecord('name', env, 0, false, true, true);
        if (!environ)
        {
            console.log("ERROR: environment '" + env + "' not found");
            return;
        }
        this.lineage.push(environ);
        while (environ.get('name') != environ.get('environment_name'))
        {
            var lkup = this.env_store.findRecord('name', environ.get('environment_name'), 0, false, true, true);
            environ = lkup;
            this.lineage.push(environ);
        }
        var lineage_display = '';
        Ext.each(this.lineage, function(i)
        {
            if (lineage_display != '')
            {
                lineage_display = lineage_display + ' > ';
            }
            lineage_display = lineage_display + i.data.name;
        }, this, true);
        Ext.getCmp('lineage_display').setText(lineage_display);
    },
    loadEnvironment: function(env)
    {
        this.env_store.clearFilter();
        var selection = this.getSelectionModel().getSelection();
        if (selection.length)
        {
            this.selectedService = selection[0].get('name');
        }
        this.store.removeAll(true);
        this.view.refresh();
        // no longer needed as new environmentservces proxy handles this
        // var proxy = this.getStore().getProxy();
        // proxy.url = PP.config.cmdb_api_path + 'environments/' + env + '/services'
        this.getStore().getProxy().setExtraParam('_tag_environment', '1');
        this.selectedEnvironment = this.env_store.findRecord('name', env, 0, false, true, true);
        this.store.load();
        this.dockedItems.items[1].items.items[0].setValue(env);
        Ext.getCmp('service_view').reset();
        Ext.getCmp('service_grid').getSelectionModel().deselectAll();
        this.env_store.clearFilter();
        this.setLineage(env);
    },

    initComponent: function()
    {

        var me = this;
        // this.env_store=Ext.StoreManager.get("environment_name_store");		
        this.tbar = [];
        var env_combo = PP.getEditorConfig('environment_name',
        {
            entity: 'system',
            labels: true
        });
        env_combo.value = this.defaultEnvironment || null;
        env_combo.listeners.collapse = {
            fn: function(field)
            {
                var a = field.getValue();
                this.loadEnvironment(field.getValue());
            },
            scope: this
        };
        this.dockedItems = [
        {
            xtype: 'toolbar',
            dock: 'top',
            items: [
                env_combo,
                {
                    xtype: 'tbfill'
                },
                {
                    xtype: 'button',
                    text: 'Add/Remove Environments',
                    handler: function()
                    {
                        var w = new Ext.Window(
                        {
                            title: "Environments",
                            height: 500,
                            width: 700,
                            layout: "border",
                            items: [new PP.EntityEditorGrid(
                            {
                                entity: 'environments',
                                startQuery: '*',
                                region: "center",
                                deleteEnabled: true
                            })]
                        });
                        w.show();
                        w.on("close",function()
                        {
                            PP.reloadComboStores('environment_name');
                        });
                    }
                }
            ]
        },
        {
            xtype: 'toolbar',
            dock: 'top',
            items: [
            {
                text: 'Service list for: ',
                xtype: 'tbtext',
                cls: 'lineage'
            },
            {
                id: 'lineage_display',
                xtype: 'tbtext',
                cls: 'lineage',
                text: 'test'
            },
            {
                xtype: 'tbfill'
            },
            {
                xtype: 'button',
                // Create new record
                scope: this,
                text: 'Add New Service',
                handler: this.buttonHandler
            }]
        }];
        this.dockedItems[0].items.push();

        this.store = new Ext.data.Store(
        {
            model: me.entity,
            instance: this,
            autoLoad: false,
            autoSync: false,
            sorters: ['name'],
            proxy:
            {
                type: 'environmentservices',
                getEnvironment: function()
                {
                    if (me.selectedEnvironment)
                    {
                        return me.selectedEnvironment.get('name');
                    }
                    return me.defaultEnvironment;
                },
                filterParam: undefined,
                groupParam: undefined,
                groupDirectionParam: undefined,
                limitParam: undefined,
                pageParam: undefined,
                sortParam: undefined,
                startParam: undefined
            },
            listeners:
            {
                load:
                {
                    fn: function(store, recs, opts)
                    {
                        if (this.selectedService)
                        {
                            var recIdx = me.getStore().find('name', this.selectedService);
                            me.getSelectionModel().select(recIdx);
                        }
                    },
                    scope: me
                }
            }
        });

        PP.EnvironmentServices.superclass.initComponent.call(this);
    },
});