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

// Load NagUI.
// NOTE, this file is only included if inventory config has nagios integration turned on 
if(typeof NagUI == 'undefined')
{
    Ext.namespace('NagUI');
    NagUI.log = function(log) {
        if (window.console) {
            console.log(log);
        }
    }
    Date.prototype.format=function(f)
    {
        return Ext.util.Format.date(this,f);
    }
}
NagUI.nagios_write=false;
NagUI.url='/nagui/nagios_live.cgi';
var url=NagUI.url +'?fetchconfig=1',
xhr, status, onScriptError;

if (typeof XMLHttpRequest !== 'undefined') {
    xhr = new XMLHttpRequest();
} else {
    xhr = new ActiveXObject('Microsoft.XMLHTTP');
}

xhr.open('GET', url, false);
xhr.send(null);

status = (xhr.status === 1223) ? 204 : xhr.status;
if (status >= 200 && status < 300) {
    
    var data=Ext.decode(xhr.responseText);
    if(data)
    {
        NagUI.config=data;
    }
}
else {
    onError.call(this, "Failed loading config via XHR: '" + url + "'; " +
                       "XHR status code: " + status);
}
loadjscssfile(PP.config.nagios_path + 'nagios.css','css');
Ext.Loader.loadScript(PP.config.nagios_path + 'nagiosnew.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosStore.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosContextMenu.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosGridPanel.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosTree.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosViews.js');
Ext.Loader.loadScript(PP.config.nagios_path + 'lib/NagiosActions.js');


// Load the user info syncronously
var url=NagUI.url +'?getuser=1',
xhr, status, onScriptError;

if (typeof XMLHttpRequest !== 'undefined') {
    xhr = new XMLHttpRequest();
} else {
    xhr = new ActiveXObject('Microsoft.XMLHTTP');
}

xhr.open('GET', url, false);
xhr.send(null);

status = (xhr.status === 1223) ? 204 : xhr.status;
NagUI.username='read only user';
NagUI.nagios_write=false;
if (status >= 200 && status < 300) {
    
    var data=Ext.decode(xhr.responseText);
    NagUI.username='read only user';
    NagUI.nagios_write=false;
    var useraccesshtml='<br/>read only access<br/>';
    if(data)
    {       
        if(data.can_submit_commands)
        {
            NagUI.username=data.name;
            NagUI.nagios_write=true;
        }
        useraccesshtml='Username: ' + data.name +'<br/>Can Submit Commands: ' + NagUI.nagios_write;
    }
}
else {
    onError.call(this, "Failed loading user info via XHR: '" + url + "'; " +
                       "XHR status code: " + status);
}
// done getting user info


PP.nagiosHostList=function(){
    var c = Ext.getCmp('system_grid').getStore().collect('fqdn');
    var q = 'GET hosts|';
    for (var a = 0; a < c.length; a++) {
        q += 'Filter: name ~~ ' + c[a] + ' |'
    }
    q += 'Or: ' + c.length;
    NagUI.nodeQueries.search = q;
    var naglist = new NagUI.NagiosTree({
        rootVisible: false,
        store: new NagUI.NagiosStore({
            root: {
                loaded: false,
                expanded: false,
                parms:{
                    node: 'treeloader',
                    nodetext: 'name',
                    query: 'search'
                }
            }
        }),
        viewConfig:{
            loadMask:true
        },
        tbar:[
            {   
                icon:'/nagui/images/logrotate.png',
                text: 'Refresh',
                handler: function(){
                    var r=naglist.getStore().getRootNode();
                    r.data.parms={
                        node: 'treeloader',
                        nodetext: 'name',
                        query: 'search'
                    };
                    r.collapse();
                    r.removeAll();
                    r.expand();
                },
            },
            {
                text: 'Select all',
                handler: function(i)
                {
                    var node=naglist.getStore().getRootNode();
                    node.cascadeBy(function(n){
                        n.set('checked',true);
                    });
                }
            },
            {   
                iconCls:'x-tree-schedule',
                text: 'Schedule Downtime (checked)',
                disabled: !NagUI.config.enabled_actions.scheduledowntime,                           
                handler:function(){
                    var nodes=naglist.getChecked();
                    if(nodes.length>0)
                    {
                        scheduleDowntimeWindow(nodes);
                    }
                }
            },
            {   
                iconCls:'x-tree-schedule',
                text: 'Remove Downtime (checked)',
                disabled: !NagUI.config.enabled_actions.scheduledowntime,                           
                handler:function(){
                    var nodes=naglist.getChecked();
                    if(nodes.length>0)
                    {
                        removeDowntime(nodes);
                    }
                }
            },
            {   
                iconCls:'x-tree-comment',
                text: 'Add Comment (checked)',
                disabled: !NagUI.config.enabled_actions.comment,                            
                handler:function(){
                    var nodes=naglist.getChecked();
                    if(nodes.length>0)
                    {
                        commentWindow(nodes);
                    }
                }
            }
        ]
    });
    var search = naglist.store.getRootNode();
    search.data.loaded = false;
    // search.data.parms = ;
    var w = new Ext.Window({
        title: 'NagUI',
        height: window.innerHeight-100,
        width: 800,
        layout: 'fit',
        items: naglist
    });
    w.show();        
    w.on('show',function(){

        search.collapse();
        search.removeAll();
        search.expand();
        PP.nodesearch=search;
    },
    naglist,{
        single:true
    });
}