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

if(!Ext.ModelManager.getModel('audit'))
{
    Ext.define('audit',{
        extend: 'Ext.data.Model',
        // idProperty: 'entity_key',
        fields:[
        "change_user",
        "new_value",
        "entity_key",
        "entity_name",
        "change_ip",
        "field_name",
        "old_value",
        "change_time"
        ],
        proxy:{
            type: 'rest',
            startParam: undefined,
            pageParam: undefined,
            limitParam: undefined,
            filterParam: undefined,
            url: PP.config.inv_api_path + 'inv_audit'
        }
    });
}
Ext.define('PP.AuditPanel',{
    extend: 'Ext.grid.Panel',
    columns:[],
    title: 'Audit',
    features: [{
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
    loaded: false,
    viewConfig:{
        loadMask:true
    },
    listeners: {
        'resize':{
            fn: function(p){
                p.load();
            }
        },
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
    store: new Ext.data.Store({
        model: 'audit',
        autoLoad:false,
        baseParams: {
            _format: 'json',
            _extjs: 1
        }
    }),
    columns:[
        {header:'Date',flex:1,dataIndex:'change_time',sortable:true,filterable:true},
        {header:'User',flex:1,dataIndex:'change_user',sortable:true,filterable:true},
        {header:'Field',flex:1,dataIndex:'field_name',sortable:true,filterable:true},
        {header:'Old Value',flex:1,dataIndex:'old_value',sortable:true,filterable:true},
        {header:'New Value',flex:1,dataIndex:'new_value',sortable:true,filterable:true}
    ],
    load: function(key){
        if(key)
        {
            if(this.key!=key)
            {
                this.loaded=false;
            }
            this.key=key;
        }
        if(!this.loaded && this.isVisible() && this.key)
        {
        // this.store.removeAll();
            this.store.load({params:{entity_key:this.key}});
            this.loaded=true;            
        }
    },
    clear: function(){
        this.loaded=false;
        this.store.removeAll();
        this.key=undefined;
    }
});