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

Ext.define('PP.SystemGrid',
{
    extend: 'Ext.grid.Panel',
    alias: 'widget.systemgrid',
    lexicon: PP.lexicon,
    selType: 'rowmodel',
    // title: 'System List',
    entity: 'system',
    uses: [
        'Ext.ux.exporter.Exporter'
    ],
    plugins: [
        Ext.create('Ext.grid.plugin.RowEditing',
        {
            clicksToEdit: 2,
            autoCancel: false,
            listeners:
            {
                beforeedit: function(ed, e)
                {
                    if(!this.editor.down('button').hasListener('mouseover') )
                    {
                        var editor = this.editor;
                        var updatebutton=editor.down('button');
                        var grid = this.grid;
                        updatebutton.on('mouseover',function(){
                            var r=grid.getSelectionModel().getSelection()[0];
                            var changes=editor.getForm().getFieldValues(true);
                            var changes_text='';
                            for(var field in changes)
                            {
                                if(changes[field] == null && r.data[field] == "" )
                                {
                                    continue;
                                }
                                else
                                {
                                    changes_text += PP.getFieldLabel(field) + ":&nbsp;" + r.data[field] + "=>" + changes[field] + "<br />";
                                }
                            }

                            this.setTooltip({
                                title: 'Changes',
                                width: 'auto',
                                text: changes_text
                            });
                        } );
                    }
                    return PP.allowEditing;
                },
                validateedit: function(ed, e) {},
                edit: function(ed, e)
                {
                    if (PP.allowEditing)
                    {
                        // warn user if they are setting to decommissioned
                        if (PP.config.ncc_api && e.originalValues.status != 'decommissioned' && e.newValues.status == 'decommissioned')
                        {
                            Ext.MessageBox.show(
                            {
                                title: 'Warning',
                                msg: 'Setting the status to decommissioned will not terminate the instance. You must select the instance and select Actions -> Terminate Selected NOMS Instance',
                                buttons: Ext.MessageBox.OKCANCEL,
                                fn: function(btn)
                                {
                                    if (btn == 'cancel')
                                    {
                                        e.record.set('status', e.originalValues.status);
                                        ed.cancelEdit();
                                    }
                                    else
                                    {
                                        if (PP.allowEditing)
                                        {
                                            ed.completeEdit();
                                            PP.saveRecord(e.record);
                                        }
                                    }
                                }
                            });
                        }
                        else
                        {
                            PP.saveRecord(e.record);
                        }
                    }
                }
            }
        })
    ],
    features: [
    {
        ftype: 'columnsconfig'
    }],
    loadSearch: function(arr)
    {
        var t = 0;
        Ext.each(this.getDockedItems('toolbar[dock=top]'), function(d)
        {
            if (t > 0)
            {
                this.removeDocked(d);
            }
            t++;
        }, this);
        t = 0;
        Ext.each(arr, function(i)
        {
            var op = i.split(/(~|!~|=|!=|<|>)/);
            if (t > 0)
            {
                this.addSearchBar();
            }
            var tbar = this.getDockedItems('toolbar[dock=top]')[t];
            tbar.items.items[1].setValue(op[0]);
            tbar.items.items[2].setValue(op[1]);
            tbar.items.items[3].setValue(op[2]);
            t++;;
        }, this);
        this.doSystemSearch();
        this.searchlink.setText;
    },
    buildSearch: function()
    {
        var cnt = this.getDockedItems('toolbar[dock=top]');
        var qparms = [];
        var qs = [];

        for (var a = 0; a < cnt.length; a++)
        {
            //PP.log('getting values for toolbar ' +a);
            if (cnt[a].items.length >= 3)
            {
                qs.push(cnt[a].items.items[1].getValue() + cnt[a].items.items[2].getValue() + cnt[a].items.items[3].getValue());
            }
        }
        return qs;
    },
    doSystemSearch: function()
    {
        var qs = this.buildSearch().join('&');
        this.searchlink.el.dom.href = '?' + qs;
        Ext.getCmp('system_grid').getSelectionModel().deselectAll();
        Ext.getCmp('system_view').clear();
        this.store.load(
        {
            params:
            {
                query: qs
            }
        });
    },
    colSizes:
    {
        fqdn: 160,
        system_type: 75,
        inventory_component_type: 75,
        asset_tag_number: 70,
        ip_address: 120,
        status: 100,
        roles: 160
    },
    addSearchBar: function()
    {
        this.toolbars++;
        var newtbar = new Ext.Toolbar(
        {
            // renderTo:Ext.getCmp('system_grid').tbar,
            // id:'toolbar'+this.grid.toolbars,
            dock: 'top',
            items: [
                'and',
                {
                    xtype: 'combo',
                    name: 'search_field' + this.toolbars,
                    // id: 'search_field' + '1',
                    mode: 'local',
                    value: 'fqdn',
                    selectOnFocus: true,
                    selectOnTab: false,
                    forceSelection: true,
                    store: this.sfields
                },
                {
                    xtype: 'combo',
                    name: 'operator' + this.toolbars,
                    // id: 'operator' + '1',
                    width: 37,
                    triggerAction: 'all',
                    mode: 'local',
                    value: '~',
                    selectOnFocus: true,
                    selectOnTab: false,
                    store: ['~', '!~', '=', '>', '<', '!=']
                },
                {
                    xtype: 'trigger',
                    name: 'search_input' + this.toolbars,
                    // id: 'search_input' + '1',
                    triggerScope: this,
                    triggerCls: 'x-form-search-trigger',
                    onTriggerClick: function()
                    {
                        this.triggerScope.doSystemSearch()
                    },
                    listeners:
                    {
                        'specialkey': function(f, e)
                        {
                            if (e.getKey() == e.ENTER)
                            {
                                this.triggerScope.doSystemSearch();
                            }
                        }
                    },
                    style:
                    {
                        marginRight: '10px'
                    }
                },
                {
                    xtype: 'tbfill'
                },
                {
                    iconCls: 'close',
                    grid: this,
                    handler: function()
                    {
                        this.grid.removeDocked(this.up('toolbar'));
                    }
                }
            ]
        });
        this.addDocked(newtbar);
    },
    pendingRender: function(value, o, r, row, col, store)
    {
        if (typeof r.data.changes != 'undefined' && r.data.changes > 0)
        {
            return '<span style="font-style:italic;font-size:10px;cursor: pointer;text-decoration:underline;color:blue;" onclick="pendingChanges(\'' + r.data.fqdn + '\');">Pending</span> ' + value;
        }
        return value;
    },
    initComponent: function()
    {
        this.columns = [];
        if (this.stateful && Ext.state.Manager.get(this.id))
        {
            Ext.each(Ext.state.Manager.get(this.id).columns, function(i)
            {
                this.columns.push(this.columnConfig(i.id));
            }, this);
            this.columns[0].renderer = this.pendingRender;
        }
        else
        {
            Ext.each(['fqdn', 'ipaddress', 'status', 'roles', 'environment_name', 'svc_id', 'tags', 'notes'], function(ff)
            {
                this.columns.push(this.columnConfig(ff));
            }, this);
            this.columns[0].renderer = this.pendingRender;
        }
        this.sfields = [];
        Ext.each(PP.getEntityFields('system'), function(f)
        {
            this.sfields.push([f, PP.getFieldLabel(f)]);
        }, this);
        this.sfields.sort(function(a, b)
        {
            if (a[1] < b[1]) return -1;
            if (a[1] > b[1]) return 1;
            return 0;
        });
        this.counter = new Ext.toolbar.Item(
        {
            text: '0'
        });
        this.searchlink = new Ext.toolbar.Item(
        {
            xtype: 'box',
            autoEl:
            {
                tag: 'a',
                href: '',
                cn: 'Permalink'
            }
        });
        this.bbar = [
            'Total Records: ',
            this.counter,
            // {xtype: 'tbspace'},
            '-',
            {
                xtype: 'exporterbutton',
                downloadImage: 'ux/exporter/download_english.png',
                swfPath: 'flash/downloadify.swf',
                downloadName: 'systems',
                formatter: 'csv'
            },
            {
                xtype: 'tbfill'
            },
            this.searchlink
        ];
        this.toolbars = 1;
        this.tbar = [
            ' ',
            {
                xtype: 'combo',
                name: 'search_field' + '1',
                // id: 'search_field' + '1',
                mode: 'local',
                value: 'fqdn',
                selectOnFocus: true,
                selectOnTab: false,
                forceSelection: true,
                store: this.sfields
            },
            {
                xtype: 'combo',
                name: 'operator' + '1',
                // id: 'operator' + '1',
                width: 37,
                triggerAction: 'all',
                mode: 'local',
                value: '~',
                selectOnFocus: true,
                selectOnTab: false,
                forceSelection: true,
                store: ['~', '!~', '=', '>', '<', '!=']
            },
            {
                xtype: 'trigger',
                name: 'search_input' + '1',
                // id: 'search_input' + '1',
                triggerScope: this,
                triggerCls: 'x-form-search-trigger',
                onTriggerClick: function()
                {
                    this.triggerScope.doSystemSearch()
                },
                listeners:
                {
                    'specialkey': function(f, e)
                    {
                        if (e.getKey() == e.ENTER)
                        {
                            this.triggerScope.doSystemSearch();
                        }
                    }
                },
                style:
                {
                    marginRight: '10px'
                }
            },
            {
                text: 'Actions',
                menu:
                {
                    items: [
                        {
                            text: 'Add Search Term',
                            iconCls: 'add',
                            grid: this,
                            scope: this,
                            handler: this.addSearchBar
                        },
                        {
                            scope: this,
                            text: 'New Entry',
                            disabled: !PP.allowEditing,
                            handler: this.addRecord
                        },
                        {
                            iconCls: 'option',
                            text: 'Change Column Config',
                            handler: function()
                            {
                                this.adjustGridColumns();
                            },
                            scope: this
                        },
                        {
                            // iconCls:'option',
                            text: 'Save Query',
                            handler: function()
                            {
                                var quicklinks = Ext.getCmp('quicklinktree');
                                if (typeof quicklinks == 'undefined')
                                {
                                    return;
                                }
                                var search = this.buildSearch();
                                var qn = quicklinks.store.getRootNode().childNodes[0];
                                var view = quicklinks.view
                                view.getSelectionModel().select(qn);
                                Ext.MessageBox.show(
                                {
                                    title: 'Save Query',
                                    msg: 'Please name your query:',
                                    fn: function(btn, name)
                                    {
                                        if (btn == 'ok')
                                        {
                                            var newnode = qn.appendChild(
                                            {
                                                text: name,
                                                qtype: 'query',
                                                query: search,
                                                leaf: true
                                            });
                                            qn.expand();
                                            view.getSelectionModel().select(newnode);
                                            PP.syncSavedQueries();
                                        }
                                    },
                                    buttons: Ext.MessageBox.OKCANCEL,
                                    animateTarget: view.getSelectedNodes[0],
                                    width: 120,
                                    closable: false,
                                    prompt: true
                                });

                            },
                            scope: this
                        },
                        '-',
                        {
                            text: 'NagUI for records shown',
                            handler: PP.nagiosHostList,
                            hidden: !PP.config.nagios
                        },
                        {
                            text: 'Graphite for records shown',
                            handler: function()
                            {
                                Graphite.graphiteWindow(this.store.data.items, 'fqdn');
                            },
                            scope: this,
                            hidden: !PP.config.graphite.enable
                        },
                        '-',
                        {
                            text: 'Run Puppet (rundeck)',
                            disabled: !PP.allowEditing,
                            handler: function()
                            {
                                var rec = this.getSelectionModel().getSelection()[0];
                                if (!rec)
                                {
                                    Ext.Msg.alert('Error', 'You have no system selected');
                                    return;
                                }
                                Ext.MessageBox.confirm('Run Puppet', 'Call rundeck to execute puppet on ' + rec.data.fqdn + '?', function()
                                {
                                    PP.runPuppet(rec.data.fqdn);
                                });
                            },
                            scope: this,
                            hidden: !PP.config.rundeck_api
                        },
                        {
                            text: 'Create NOMS Instance',
                            handler: PP.newInstanceWindow,
                            disabled: !PP.allowEditing,
                            hidden: !PP.config.ncc_api
                        },
                        {
                            text: 'View Instance Console',
                            hidden: !PP.config.ncc_api,
                            handler: function()
                            {
                                var rec = this.getSelectionModel().getSelection()[0];
                                if (!rec)
                                {
                                    Ext.Msg.alert('Error', 'You have no system selected');
                                    return;
                                }
                                PP.showInstanceConsole(rec);

                            },
                            scope: this
                        },

                        {
                            text: 'Reboot Selected NOMS Instance',
                            disabled: !PP.allowEditing,
                            hidden: !PP.config.ncc_api,
                            handler: function()
                            {
                                var rec = this.getSelectionModel().getSelection()[0];
                                if (!rec)
                                {
                                    Ext.Msg.alert('Error', 'You have no system selected');
                                    return;
                                }
                                if (rec.data.status == 'decommissioned')
                                {
                                    Ext.Msg.alert('Error', 'The selection is already decommissioned');
                                    return;
                                }
                                Ext.Msg.confirm('Confirm', 'Are you sure you want to hard reboot this instance?<br>This will NOT cleanly shut down the instance', function(btn)
                                {
                                    if (btn == 'yes')
                                    {
                                        PP.rebootInstance(rec);
                                    }
                                }, this);

                            },
                            scope: this
                        },
                        {
                            text: 'Terminate Selected NOMS Instance',
                            disabled: !PP.allowEditing,
                            hidden: !PP.config.ncc_api,
                            handler: function()
                            {
                                var rec = this.getSelectionModel().getSelection()[0];
                                if (!rec)
                                {
                                    Ext.Msg.alert('Error', 'You have no system selected');
                                    return;
                                }
                                if (rec.data.cloud == "" || rec.data.cloud == null || !rec.data.serial_number)
                                {
                                    Ext.Msg.alert('Error', 'The selection does not appear to be a NOMS instance. (no value found for cloud or serial_number)');
                                    return;
                                }
                                if (rec.data.status == 'decommissioned')
                                {
                                    Ext.Msg.alert('Error', 'The selection is already decommissioned');
                                    return;
                                }
                                Ext.Msg.confirm('Confirm', 'Are you sure you want to terminate this instance?<br>This cannot be undone', function(btn)
                                {
                                    if (btn == 'yes')
                                    {
                                        PP.terminateInstance(rec);
                                    }
                                }, this);

                            },
                            scope: this
                        }

                    ]
                }
            }
        ];
        this.store = new Ext.data.Store(
        {
            model: 'system',
            storeId: 'systemstore',
            proxy:
            {
                type: 'rest',
                timeout: 20000000,
                url: PP.config.cmdb_api_path + 'system',
                buildUrl: function(request)
                {
                    var url = this.getUrl(request);
                    var me = this;
                    if (request.params.query)
                    {
                        if (!url.match(/\/$/))
                        {
                            url += '/?';
                        }
                        url += request.params.query
                        request.url = url;
                        delete request.params.query;
                    }
                    return url;
                },
                listeners:
                {
                    exception: function(proxy, response, operation)
                    {
                        if (operation)
                        {
                            if(operation['error'] && operation['error']['status'])
                            Ext.Msg.alert('System Grid Error',operation.error.status + ": " + operation.error.statusText);
                        }
                        else
                        {
                            // May be a proxy error...
                        }
                    }
                }
            }
        });
        this.store.on('load', function()
        {
            this.counter.update(' ' + this.store.getCount());
        }, this);
        PP.SystemGrid.superclass.initComponent.call(this);
    },
    setColumns: function(cols)
    {
        var me = this;
        var columns = [];
        Ext.each(cols, function(ff)
        {
            columns.push(this.columnConfig(ff));
        }, this);

        me.reconfigure(undefined, columns);
        me.fire
    },
    columnConfig: function(field)
    {
        var editorConfig = PP.getEditorConfig(field,
        {
            entity: 'system',
            labels: false
        });
        if (editorConfig.xtype == 'textarea')
        {
            editorConfig.xtype = 'textfield';
        }
        return {
            header: PP.getFieldLabel(field),
            dataIndex: field,
            headerId: field,
            stateId: field,
            flex: 1,
            // locked: false,
            width: (this.colSizes[field] ? this.colSizes[field] : undefined),
            field: editorConfig
        };
    },
    adjustGridColumns: function()
    {
        var grid = this;
        var entity = grid.entity
        var selectedFields = [];
        grid.headerCt.items.each(function(i)
        {
            selectedFields.push(i.headerId);
        });
        var colWin = Ext.create('widget.window',
        {
            height: 300,
            width: 580,
            title: 'Column Selector',
            layout: 'border',
            closable: true,
            items: [
            {
                xtype: 'panel',
                region: 'north',
                height: 18,
                bodyCls: 'cmdb-panel-body-' + PP.config.highlight_color,
                border: 0,
                html: '<i>note: this will reset any locked columns</i>'
            },
            {
                xtype: 'form',
                region: 'center',
                border: 0,
                bodyCls: 'cmdb-panel-body-' + PP.config.highlight_color,
                labelWidth: 1,
                bodyPadding: 10,
                items: [
                {
                    xtype: "itemselector",
                    name: "columnselector",
                    id: 'columnselector',
                    fieldBodyCls: 'cmdb-panel-body-' + PP.config.highlight_color,
                    anchor: '100%',
                    height: 200,
                    store: grid.sfields,
                    value: selectedFields,
                    grid: grid
                }],
                buttons: [
                {
                    text: 'Save',
                    handler: function()
                    {
                        var columnSelector = Ext.getCmp('columnselector');
                        columnSelector.grid.setColumns(columnSelector.getValue());
                        // columnSelector.grid.saveState();
                        colWin.close();
                    }
                }]
            }]
        });
        colWin.show();
    },
    initStateEvents: function()
    {
        var events = this.stateEvents;
        // push on stateEvents if they don't exist
        Ext.each(['reconfigure'], function(event)
        {
            if (Ext.Array.indexOf(events, event))
            {
                events.push(event);
            }
        });
        this.callParent();
    },
    addRecord: function(b)
    {
        if (!PP.allowEditing)
        {
            //	return;
        }

        PP.log('new');
        PP.log(b);
        PP.log(this);

        var p = Ext.ModelManager.create(
        {}, this.entity);
        if (this.rec_template)
        {
            PP.log(this.rec_template);
            for (i in this.rec_template)
            {
                if (typeof this.rec_template[i] == 'function')
                {
                    p.set(i, this.rec_template[i]());
                    continue;
                }
                p.set(i, this.rec_template[i]);
            }
        }
        else
        {
            p.set('inventory_component_type', 'system');
        }
        this.store.insert(0, p);
        this.editingPlugin.startEdit(p, this.columns[0]);
    }


});