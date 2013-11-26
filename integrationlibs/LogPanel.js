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
if(PP.config.enableLogStash)
{
    Ext.define('PP.Logstash_Proxy', {
        extend: 'Ext.data.proxy.Ajax',
        alias: 'proxy.logstash',
        actionMethods: {
            read: 'POST'
        },
        requestQuery: {},
        doRequest: function(operation, callback, scope) {
            var writer  = this.getWriter(),
                request = this.buildRequest(operation);
                
            if (operation.allowWrite()) {
                request = writer.write(request);
            }
            
            Ext.apply(request, {
                binary        : this.binary,
                headers       : this.headers,
                timeout       : this.timeout,
                scope         : this,
                jsonData      : this.requestQuery,
                callback      : this.createRequestCallback(request, operation, callback, scope),
                method        : this.getMethod(request),
                disableCaching: false // explicitly set it to false, ServerProxy handles caching
            });
            
            Ext.Ajax.request(request);
            
            return request;
        },
    });
    Ext.define('logentry',{
        extend: 'Ext.data.Model',
        // idProperty: 'entity_key',
        fields:[
        { name:'timestamp',mapping:'_source["@timestamp"]'},
        { name: 'type', mapping: '_source["@type"]'},
        { name: 'message', mapping: '_source["@message"]'},
        { name: 'source_host', mapping: '_source["@source_host"]'},
        { name: 'program', mapping: '_source["@fields"].syslog_program[0]'},
        { name: 'facility', mapping: '_source["@fields"].syslog_facility'}
        ],
        remoteSort: false,
        proxy:{
            type: 'logstash',
            startParam: undefined,
            pageParam: undefined,
            limitParam: undefined,
            filterParam: undefined,
            url: PP.config.logstashpath,
            actionMethods: {read:'POST'},
            sortParam:undefined,
            reader:{
                type:'json',
                root:'hits.hits'
            }
        }
    });
    Ext.define('PP.LogPanel',{
        extend: 'Ext.grid.Panel',
        alias: 'widget.logpanel',
        title: 'Logs',
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
            },
            {
                xtype: 'box',
                autoEl: {
                    tag: 'a',
                    target: '_blank',
                    href: 'http://' + PP.config.logstash_server + '/',
                    cn: 'LogStash UI'
                }
            }
        ],
        viewConfig:{
            loadMask:true
        },
        store: new Ext.data.Store({
            model: 'logentry',
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
            {header:'Facility',flex:1,dataIndex:'facility',sortable:true,filterable:true}
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
                var logquery=PP.prepquery(this.system_fqdn);
                this.store.getProxy().url=PP.config.logstashpath + 'logstash-' + Ext.Date.format(new Date(),'Y.m.d') + '/_search';
                this.store.getProxy().requestQuery=logquery;
                this.store.load();
                PP.log('fetched logs with query: ');
                PP.log(logquery);
                this.loaded=true;
            }
        },
        prepquery: function(host,days){
            if(days==undefined || days=='')
            {
                days=1;
            }
            var logstashquery={
              "query": {
                "filtered": {
                  "query": {
                    "query_string": {
                      "query": "@source_host:\"m0044556.lab.ppops.net\""
                    }
                  },
                  "filter": {
                    "range": {
                      "@timestamp": {
                        "from": "2013-07-09T11:39:06.040Z",
                        "to": "2013-07-09T17:39:06.041Z"
                      }
                    }
                  }
                }
              },
              "highlight": {
                "fields": {},
                "fragment_size": 2147483647,
                "pre_tags": [
                  "@start-highlight@"
                ],
                "post_tags": [
                  "@end-highlight@"
                ]
              },
              "size": 500,
              "sort": [
                {
                  "@timestamp": {
                    "order": "desc"
                  }
                }
              ]
            };

            logstashquery.query.filtered.query.query_string.query='@source_host:"' + host + '"';
            logstashquery.query.filtered.filter.range['@timestamp'].from=Ext.Date.format(Ext.Date.subtract(new Date(),Ext.Date.DAY,days),'Y-m-d\\TH:i:s') + '.000Z';
            logstashquery.query.filtered.filter.range['@timestamp'].to=Ext.Date.format(new Date(),'Y-m-d\\TH:i:s') + '.000Z';;
            return logstashquery;
        }
    });
}