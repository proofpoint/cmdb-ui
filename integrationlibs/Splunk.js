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

if(PP.config.enableSplunk)
{
    // Ext.define('PP.Logstash_Proxy', {
    //     extend: 'Ext.data.proxy.Ajax',
    //     alias: 'proxy.logstash',
    //     actionMethods: {
    //         read: 'POST'
    //     },
    //     requestQuery: {},
    //     doRequest: function(operation, callback, scope) {
    //         var writer  = this.getWriter(),
    //             request = this.buildRequest(operation);
                
    //         if (operation.allowWrite()) {
    //             request = writer.write(request);
    //         }
            
    //         Ext.apply(request, {
    //             binary        : this.binary,
    //             headers       : this.headers,
    //             timeout       : this.timeout,
    //             scope         : this,
    //             jsonData      : this.requestQuery,
    //             callback      : this.createRequestCallback(request, operation, callback, scope),
    //             method        : this.getMethod(request),
    //             disableCaching: false // explicitly set it to false, ServerProxy handles caching
    //         });
            
    //         Ext.Ajax.request(request);
            
    //         return request;
    //     },
    // });


    Ext.define('splunkentry',{
        extend: 'Ext.data.Model',
        // idProperty: 'entity_key',
        fields:[
        { name:'timestamp',mapping:'_time'},
        { name: 'type', mapping: 'sourcetype'},
        { name: 'message', mapping: '_raw'},
        { name: 'source_host', mapping: 'host'},
        { name: 'program', mapping: 'process'},
        { name: 'processId', mapping: 'pid'}
        ],
        remoteSort: false,
        proxy:{
            type: 'rest',
            startParam: undefined,
            pageParam: undefined,
            limitParam: undefined,
            filterParam: undefined,
            url: PP.config.splunkPath,
            actionMethods: {read:'POST'},
            extraParams: {
                count: 100,
                earliest_time: '-24h@m',
                latest_time: 'now',
                exec_mode: 'oneshot',
                output_mode: 'json',
                search:''
            },
            sortParam:undefined,
            reader:{
                type:'json',
                root:'results'
            }
        }
    });

    Ext.define('PP.SplunkPanel',{
        extend: 'Ext.grid.Panel',
        alias: 'widget.splunkpanel',
        title: 'Splunk',
        system_fqdn:'',
        loaded: false,
        features: [ {
            ftype: 'filters',
            // encode and local configuration options defined previously for easier reuse
            encode: 'encode', // json encode the filter query
            local: 'local',   // defaults to false (remote filtering)

            // Filters are most naturally placed in the column definition, but can also be
            // added here.
            filters: [{
                type: 'boolean',
                dataIndex: 'visible'
            }]
        }],
        listeners: {
            'activate':{
                fn: function(p){
                    p.load();
                }
            },
            'boxready':{
                fn: function(p){
                    p.load();
                }
            }
        },
        tbar:[
            {
                xtype:'button',
                icon: 'images/refresh.gif',
                text: 'Refresh',
                handler: function(){
                    var p=this.up('panel');
                    p.loaded=false;
                    p.load();
                },
            },
            {
                xtype:'tbfill'
            }
            // ,
            // {
            //     xtype: 'box',
            //     autoEl: {
            //         tag: 'a',
            //         target: '_blank',
            //         href: 'http://' + PP.config.logstash_server + '/',
            //         cn: 'LogStash UI'
            //     }
            // }
        ],
        viewConfig:{
            loadMask:true
        },
        store: new Ext.data.Store({
            model: 'splunkentry',
            sorters: [{
                property:'timestamp',
                direction: 'DESC'
            }],
            instance: this,
            autoLoad:false
        }),
        columns:[
            {header:'Date',flex:1,dataIndex:'timestamp',sortable:true,filterable:true},
            {header:'Host',flex:1,dataIndex:'source_host',hidden:true,sortable:true,filterable:true},
            {header:'Message',flex:2,dataIndex:'message',sortable:true,filterable:false},
            {header:'Program',flex:1,dataIndex:'program',sortable:true,filterable:true},
            {header:'ProcessID',flex:1,dataIndex:'processId', hidden:true,sortable:true,filterable:true}
        ],
        load: function(system_fqdn)
        {
            if(system_fqdn)
            {
                if(this.system_fqdn!=system_fqdn)
                {
                    this.loaded=false;
                }
                this.system_fqdn=system_fqdn;            
            }
            if(!this.loaded && this.isVisible() && this.system_fqdn)
            {
                var hostname=this.system_fqdn.split('.')[0];
                this.store.getProxy().extraParams.search="search host=" + hostname + "* | fields host sourcetype process pid";
                this.store.load();
                PP.log('fetched logs with query: ');
                PP.log(this.store.getProxy().extraParams);
                this.loaded=true;
            }
        }
    });
}