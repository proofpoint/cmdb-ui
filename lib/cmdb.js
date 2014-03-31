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

PP.rackmodel = Ext.define('rackmodel',
{
    extend: 'Ext.data.Model',
    fields: ['label', 'ru', 'size', 'tip']
})
PP.rackeditorButtonRender = function(v, meta, rec)
{
    return '<span style="font-size:10px;cursor: pointer;color:#666;" onclick="PP.showRackElevation({rack_code: \'' + v + '\',data_center_code:\'' + rec.get('data_center_code') + '\' },\'Rack Elevation: ' + v + '\');">View Elevation</span> ';
}
PP.showRackEditor = function()
{
    var fields = PP.getEntityFields('rack');
    var columns = [];
    Ext.each(fields, function(field)
    {
        columns.push(
        {
            header: PP.getFieldLabel(field, 'rack'),
            dataIndex: field,
            flex: 1,
            editor: PP.getEditorConfig(field,
            {
                entity: 'rack',
                labels: false
            })
        });
    }, this);
    columns.push(
    {
        header: '',
        dataIndex: 'rack_code',
        renderer: PP.rackeditorButtonRender,
        flex: 0,
        width: 80
    });

    var w = new Ext.Window(
    {
        title: "Racks",
        height: 500,
        width: 700,
        layout: "border",
        items: [new PP.EntityEditorGrid(
        {
            deleteEnabled: true,
            region: "center",
            entity: "rack",
            startQuerytype: "rack_code",
            startQuery: "*",
            lexicon: PP.lexicon,
            columns: columns
        })]
    });
    w.show();
}
PP.showRackElevation = function(query, title, highlight)
{
    // load hardware class lookup store
    var hwLookup = new Ext.data.Store(
    {
        model: 'hardware_model',
        autoLoad: false,
        autoSync: false
    });
    var rack_lkup = new Ext.data.Store(
    {
        model: 'rack'
    });
    var rackStore = new Ext.data.Store(
    {
        model: 'rackmodel'
    });
    var sysLookup = new Ext.data.Store(
    {
        model: 'system',
        autoLoad: false,
        autoSync: false
    });
    // fetch hardware class store to do lookups against
    hwLookup.load(
    {
        callback: function(recs, op, success)
        {
            // then run the actual query for systems needed
            sysLookup.load(
            {
                params: query,
                callback: function(recs, op, success)
                {
                    var newrecs = [];
                    for (var i = 0; i < recs.length; i++)
                    {
                        if (recs[i].get('rack_position'))
                        {
                            newrecs.push(
                            {
                                label: recs[i].get('fqdn'),
                                ru: recs[i].get('rack_position'),
                                size: recs[i].get('hardware_class') ? hwLookup.findRecord('hardware_class', recs[i].get('hardware_class')).get('size') * 1 : 1,
                                tip: (recs[i].get('manufacturer') ? recs[i].get('manufacturer') : '') + '<br>' + (recs[i].get('product_name') ? recs[i].get('product_name') : '')
                            });
                        }
                    }
                    rackStore.add(newrecs);

                    rack_lkup.load(
                    {
                        params:
                        {
                            rack_code: recs[0].get('rack_code')
                        },
                        callback: function(recs, op, success)
                        {
                            var rack_config = {};
                            if (rack_lkup.count() && rack_lkup.getAt(0).get('size'))
                            {
                                rack_config.elevation_max = rack_lkup.getAt(0).get('size');
                            }
                            var r = PP.makeRackElevation(rack_config);
                            var w = new Ext.Window(
                            {
                                height: 670,
                                width: 230,
                                layout: 'fit',
                                title: title ? title : 'Rack Elevation',
                                items: [r]
                            });
                            r.loadRecords(rackStore.data.items, highlight);
                            w.show();
                            w.setHeight(r.getBox().height + 31);

                        }
                    });
                }
            });
        }
    });
}
PP.makeRackElevation = function(config)
{
    Ext.applyIf(config,
    {
        xtype: 'rack',
        position_key: 'ru',
        ru_size_key: 'size',
        racktablespec:
        {
            id: 'racktable',
            tag: 'table',
            cellpadding: 0,
            cellspacing: 0,
            cls: 'racktable',
            children: []
        },
        datadisplay: ['<div qtip="{tip}" ',
            'onClick="PP.systemWindow(\'{label}\');"',
            'class="udata pointer">',
            '{label}',
            '</div>'
        ]
    });
    return new Ext.ux.panel.Rack(config);
}

PP.renderPuppetOutput = function(v)
{
    var display_arr = v.split('\n');
    for (var i = 0; i < display_arr.length; i++)
    {
        var log_type = display_arr[i].match(/^[a-z]+/);
        display_arr[i] = '<div class="config-output-line-' + log_type + '">' + display_arr[i] + '</div>';
    }

    return display_arr.join('\n');
}

PP.notify = function()
{
    var msgCt;

    function createBox(t, s)
    {
        return '<div class="msg"><h3>' + t + '</h3><p>' + s + '</p></div>';
    }
    return {
        msg: function(title, format)
        {
            if (!msgCt)
            {
                msgCt = Ext.core.DomHelper.insertFirst(document.body,
                {
                    id: 'msg-div'
                }, true);
            }
            var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
            var m = Ext.core.DomHelper.append(msgCt, createBox(title, s), true);
            m.hide();
            m.slideIn('t').ghost("t",
            {
                delay: 1000,
                remove: true
            });
        },

        init: function() {}
    };
}();


PP.syncSavedQueries = function()
{
    var queries = [];
    Ext.each(Ext.getCmp('quicklinktree').store.getRootNode().childNodes[0].childNodes, function(i)
    {
        queries.push(
        {
            t: i.data.text,
            q: i.data.query
        });
    });
    Ext.state.Manager.set('savedqueries', queries);
}
PP.loadSavedQueries = function()
{
    var saved = Ext.state.Manager.get('savedqueries');
    var qn = Ext.getCmp('quicklinktree').store.getRootNode().childNodes[0];
    var t = 0;
    Ext.each(saved, function(i)
    {
        var newnode = qn.appendChild(
        {
            text: i.t,
            qtype: 'query',
            query: i.q,
            leaf: true
        });
        t++;
    });
    if (t)
    {
        qn.expand();
    }
}
PP.getVals = function(invStore, field, key, cond, type)
{
    var tmparr = new Array();
    var keys = invStore.collect(key);
    if (key)
    {
        tmparr = new Object();
        // foreach(var i in keys)
        // {
        //     tmparr[keys[i]] = new Array();
        // }
        // for each record.  count or sum values of field (by key) if condition is met
        //PP.log('doing key summary for ' . key);
        var keys = invStore.collect(key).sort();
        for (var k in keys)
        {
            tmparr[keys[k]] = 0;
        }
        invStore.each(function(r)
            {
                var check = true;
                if (cond)
                {
                    if (r.get(cond[0]) == cond[1])
                    {
                        check = true;
                    }
                    else
                    {
                        check = false;
                    }
                }
                if (check)
                {
                    // if(typeof this[r.get(key)] != 'number')
                    // {
                    // 	this[r.get(key)]=0;
                    // }
                    if (r.get(key) == null || r.get(key) == '')
                    {
                        // PP.log('skipping' + key + r.get(key));

                    }
                    else
                    {
                        if (type == 'count')
                        {
                            this[r.get(key)]++;
                        }
                        if (type == 'sum')
                        {
                            this[r.get(key)] = this[r.get(key)] + (r.get(field) * 1);
                        }
                    }
                }
            },
            tmparr);
        return tmparr;
        var rtn = new Array();
        PP.log(tmparr);
        for (var k in tmparr)
        {
            PP.log(typeof k);
            if (typeof tmparr[k] == 'number' && !isNaN(tmparr[k]) && typeof tmparr[k] != 'function' && !k.match(/function/))
            {
                rtn.push(tmparr[k]);
            }
        }
        return rtn;
    }
    else
    {
        invStore.each(function(r)
            {
                this.push(r.get(field));
            },
            tmparr);
        return tmparr;
    }
}
chartConfig = {
    style: 'background:#fff',
    animate: true,
    shadow: true,
    axes: [
    {
        type: 'Numeric',
        position: 'left',
        fields: ['data1'],
        label:
        {
            renderer: Ext.util.Format.numberRenderer('0,0')
        },
        title: 'YTitle',
        // grid: true,
        minimum: 0
    },
    {
        type: 'Category',
        position: 'bottom',
        fields: ['Category'],
        title: 'XTitle'
    }],
    series: [
    {
        type: 'column',
        axis: 'left',
        highlight: true,
        tips:
        {
            trackMouse: true,
            width: 100,
            renderer: function(storeItem, item)
            {
                this.setTitle(storeItem.get('Category') + ': ' + item.value[1]);
            }
        },
        // label: {
        //   display: 'insideEnd',
        //   'text-anchor': 'middle',
        //     field: 'data1',
        //     renderer: Ext.util.Format.numberRenderer('0'),
        //     orientation: 'vertical',
        //     color: '#333'
        // },
        xField: 'name',
        yField: ['data1'],
        //color renderer
        // renderer: function(sprite, record, attr, index, store) {
        //     var fieldValue = Math.random() * 20 + 10;
        //     var value = (record.get('data1') >> 0) % 5;
        //     var color = ['rgb(213, 70, 121)', 
        //                  'rgb(44, 153, 201)', 
        //                  'rgb(146, 6, 157)', 
        //                  'rgb(49, 149, 0)', 
        //                  'rgb(249, 153, 0)'][value];
        //     return Ext.apply(attr, {
        //         fill: color
        //     });
        // }

    }]
};

PP.loadReport = function(grouping)
{
    if (Ext.getCmp('system_grid').getStore().count() == 0)
    {
        Ext.MessageBox.alert('Warning', 'You have no systems in the list to summarize.');
        return;
    }
    Ext.getCmp('mainview').setActiveTab(2);
    Ext.getCmp('key1').setValue(grouping);
    PP.loadChart();
}

PP.loadChart = function()
{
    if (Ext.getCmp('chartcontainer').items.items[0])
    {
        Ext.getCmp('chartcontainer').items.items[0].destroy();
    }
    Ext.data.StoreManager.unregister(chartConfig.store);
    var invStore = Ext.getCmp('system_grid').store;
    var field = Ext.getCmp('field1').getValue();
    var count_type = Ext.getCmp('verticaltype').getValue();
    var key1 = Ext.getCmp('key1').getValue();
    var key2 = Ext.getCmp('key2').getValue();
    var chart_type = Ext.getCmp('chart_type').getValue();
    var cond = [];
    var keys_1 = invStore.collect(key1).sort();
    PP.log(keys_1);
    var keys_2 = invStore.collect(key2).sort();
    PP.log("doing graph, field,key:" + field + " " + key1);
    var modelfields = [];
    var columns = [];
    if (key2)
    {
        modelfields = Ext.clone(keys_2);
        chartConfig.legend = {
            position: 'right'
        };
        modelfields.unshift(key2);
        modelfields.unshift('Count');
        columns.unshift(
        {
            header: key2,
            flex: 4,
            dataIndex: 'subdivide'
        });
        columns.unshift(
        {
            header: 'Count',
            flex: 1,
            dataIndex: 'Count'
        });
        chartConfig.legend = undefined;

    }
    else
    {
        modelfields.unshift('Count');
        columns.unshift(
        {
            header: 'Count',
            flex: 1,
            dataIndex: 'Count'
        });
        chartConfig.legend = undefined;

    }
    modelfields.unshift('Category');
    columns.unshift(
    {
        header: PP.getFieldLabel(key1, 'system'),
        flex: 2,
        dataIndex: 'Category'
    });
    var chartstore = Ext.create('Ext.data.Store',
    {
        fields: modelfields,
        proxy:
        {
            type: 'memory'
        },
        reader:
        {
            type: 'json'
        }
    });

    var data = [];
    // get initial data set, which will be only data set if no grouping is used.
    Ext.Object.each(PP.getVals(invStore, field, key1, (key2 ? [key2, keys_2[0]] : null), count_type), function(k, v)
    {
        var ent = {};
        ent['Category'] = k;
        if (key2)
        {
            ent[keys_2[0]] = v;
        }
        else
        {
            ent['Count'] = v;
        }
        chartstore.add(ent);
    });
    chartConfig.axes[0].fields = key2 ? [keys_2[0]] : ['Count'];
    chartConfig.series[0].yField = key2 ? [keys_2[0]] : ['Count'];
    // chartConfig.series[0].label.field= key2 ? [keys_2[0]] : ['Count'];
    if (chart_type == 'stackedcolumn')
    {
        chartConfig.series[0].stacked = true;
    }
    else
    {
        chartConfig.series[0].stacked = false;
    }
    // if we are grouping, then fetch the data set for each group, starting with 2nd
    if (key2)
    {
        chartConfig.series[0].tips.renderer = function(storeItem, item)
        {
            this.setTitle(storeItem.get('Category') + '- ' + item.yField + ': ' + item.value[1]);
        }
        PP.log('starting loop of loops');
        for (var i = 1; i < keys_2.length; i++)
        {
            if (typeof keys_2[i] != 'string' && typeof keys_2[i] != 'number')
            {
                continue;
            }
            var j = i + 1;
            chartConfig.axes[0].fields.push(keys_2[i]);
            chartConfig.series[0].yField.push(keys_2[i]);
            var data2 = [];
            // for each on the keys of the PP.getVals returns
            Ext.Object.each(PP.getVals(invStore, field, key1, [key2, keys_2[i]], count_type), function(k, v)
            {
                var chartrec = chartstore.findRecord('Category', k, 0, false, true, true);
                chartrec.set(keys_2[i], v);
                if (chartrec.get('Count') == '')
                {
                    chartrec.set('Count', v)
                }
                else
                {
                    chartrec.set('Count', chartrec.get('Count') + v);
                }
                if (v)
                {
                    if (typeof(chartrec.get('subdivide')) != 'undefined' && chartrec.get('subdivide').length > 0)
                    {
                        chartrec.set('subdivide', chartrec.get('subdivide') + ', ' + keys_2[i] + ': ' + v);
                    }
                    else
                    {
                        chartrec.set('subdivide', keys_2[i] + ': ' + v);
                    }
                }
            });
        }
    }
    chartConfig.store = chartstore;
    // update axis titles
    chartConfig.axes[0].title = count_type + ' of ' + PP.getFieldLabel(field, 'system'); // Y axis (vertical)
    chartConfig.axes[1].title = PP.getFieldLabel(key1, 'system'); // X axis (horizonal)

    Ext.getCmp('chartcontainer').add(new Ext.chart.Chart(chartConfig));
    Ext.getCmp('chart_grid').reconfigure(chartstore, columns);

    return;
}
PP.validateHostforNagios = function(r)
{
    var missing = [];
    PP.log('validating nagios data for ');
    PP.log(r);
    var fields = ['system_type', 'inventory_component_type', 'ip_address', 'roles', 'data_center_code', 'manufacturer'];
    for (i in fields)
    {
        PP.log(typeof r[fields[i]]);
        if (typeof r[fields[i]] == 'undefined' || r[fields[i]] == null || r[fields[i]].length == 0 || r[fields[i]].length < 2)
        {
            missing.push(fields[i]);
        }
    }
    return missing;
}

function adminWindow()
{
    if (!adminwin)
    {
        var adminwin = new Ext.Window(
        {
            title: 'Admin',
            height: 500,
            width: 700,
            layout: 'fit',
            closeAction: 'hide',
            items: new Ext.TabPanel(
            {
                activeTab: 0,
                items: [
                    new PP.EntityEditorGrid(
                    {
                        title: "Users",
                        entity: "user",
                        startQuery: "*",
                        lexicon: PP.lexicon
                    }),
                    new PP.EntityEditorGrid(
                    {
                        title: "ACL",
                        entity: "acl",
                        startQuery: "*",
                        lexicon: PP.lexicon
                    }),
                    new PP.EntityEditorGrid(
                    {
                        title: "Normalizers",
                        entity: "inv_normalizer",
                        lexicon: PP.lexicon,
                        startQuery: "*"
                    }),
                    new PP.EntityEditorGrid(
                    {
                        title: "Roles",
                        entity: "role",
                        lexicon: PP.lexicon,
                        startQuery: "*"
                    })
                ]
            })
        });
    }
    adminwin.show();
}