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


PP.prepquery=function(host,days){
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
PP.systemWindow=function(hostname){
    //var sv=new PP.SystemViewPanel({layout_view:'horizontal'});
    PP.log('getting system from backend');
    var system=Ext.ModelManager.getModel('system');
    var w;
    system.load(hostname,{
        success:function(sys,o){
            if(o.response.status==204)
            {
                    Ext.notify.msg(' Entry not found','');
                    return;
            }
            w=new Ext.Window({
                    width:800,
                    height:window.innerHeight < 700 ? window.innerHeight-80 : 600,
                    layout:'fit',
                    title: hostname,
                    //items:sv
                    items:new PP.SystemViewPanel({layout_view:'horizontal'})
            });
            w.show();
            // remove dock with save button
            w.items.items[0].removeDocked(w.items.items[0].getDockedItems()[0]);
            delete w.items.items[0]['saveButton'];
            w.items.items[0].load(sys);
            // dealing with race condition of setting combos before they have loaded.
        }
    });     
	return w;
}
var filters = {
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
};
Ext.define('PP.SystemViewPanel',{
	extend:'Ext.FormPanel',
	alias: 'widget.systemviewpanel',
	entity:'system',
	layout_view:'vertical',
	system:{},
	defaultType:'textfield',
	layout:{
		type: 'vbox',
		align: 'stretch'		
	},
	maskDisabled:false,
	addNagiosPanel:false,
	initComponent: function(){
		var me=this;
		if(me.layout_view=='vertical')
		{
			me.layout = { type: 'vbox',align: 'stretch' };
		}
		else
		{
			me.layout = { type: 'hbox',align: 'stretch'	};
		}
		me.field_config={};
		me.remaining_fields=[];
		me.hardware_fields=[];
		me.config_fields=[];
		me.fieldchk={};
		if(PP.config.jira)
		{
			me.jirapanel=new PP.JiraGridPanel({title:'Jira'});			
		}
		me.auditpanel=new PP.AuditPanel();
		if(PP.config.enableLogStash)
		{
			me.logpanel=new PP.LogPanel();

		}
		// initialize form fields by processing them into field defnitions
		// grouped by cagetory.  the 'main' categeory will be in the form fieldset
		// the rest of the fields in categories will be created inside tabs labelled with the
		// category.
		// the 'More Data' category will contain fields without categories

		var entity_field_list=PP.getEntityFields(me.entity);
		var entity_definition=PP.entities[me.entity];
		entity_field_list.forEach(function(field_name){
			if(!entity_definition[field_name] || entity_definition[field_name] == undefined)
			{
				return;
			}
			if( entity_definition[field_name].field_category == undefined )
			{
				entity_definition[field_name].field_category='More Data';
			}
			var tmp=PP.getEditorConfig(field_name,{entity:me.entity,labels:true});
			tmp['instance']=me;
			if(!tmp['listeners'])
			{
				tmp.listeners={};
			}
			tmp.listeners.change=me.fieldSaveValue;
			tmp.listeners.scope=me;
			if(tmp.name=='date_created' || tmp.name=='date_modified')
			{
				tmp.xtype='displayfield';
				tmp.fieldBodyCls='cmdb_display_field';
			}
			// create the field_config category if it doesn't exist
			if(me.field_config[entity_definition[field_name].field_category] == undefined)
			{
				me.field_config[entity_definition[field_name].field_category]=[];
			}
			me.field_config[entity_definition[field_name].field_category].push(tmp);
		});

		me.saveButton=new Ext.Button({
			icon:'images/save.gif',
			cls:'x-btn-text-icon',
			disabled:true,
			text:'Save',
			scope:me,
			handler:me.saveRecord
		});
		me.cancelButton=new Ext.Button({
				xtype: 'button',
				text: 'Cancel',
				disabled: true,
				handler: function(){
					me.system.reject();
					me.load(me.system);
				},
				scope: me
			});

		me.tbar=[
			{
				xtype:'button',
				icon: 'images/icon_popout.gif',
				handler: function(){
					if(me.getRecord() && me.getRecord().get('fqdn'))
					{
						me.collapse();
						PP.systemWindow(me.getRecord().get('fqdn'));						
					}
				},
				scope: me
			},
			{
				xtype:'tbfill'
			},
			me.saveButton,
			me.cancelButton,
		];
		var svTabs=[];
		var categories=Object.keys(me.field_config);
		categories.forEach(function(category){
			if(category=='main')
			{
				return;
			}
			svTabs.push({
				xtype:'panel',
				title: category,
				layout:'fit',
				frame:true,
				items:[
				{
					xtype:'fieldset',
					baseCls:'',
					autoScroll: true,
					defaults:{
						anchor: '95%'
					},
					defaultType:'textfield',
					items:me.field_config[category]
				}
				]				
			});
		});
		svTabs.push(me.auditpanel);

		if(PP.config.jira)
		{
			svTabs.push(me.jirapanel);
		}
		if(me.addNagiosPanel)
		{
			me.nagiospanel=Ext.create('NagUI.NagiosGridPanel',{
				viewConfig: { loadMask: true}
			});
			me.nagiospanel.addListener({
		        'activate':{
		            fn: function(p){
		                me.loadNagios(me.nagiospanel.system_fqdn);
		            },
		            scope: me
		        },
		        'boxready':{
		            fn: function(p){
		                me.loadNagios(me.nagiospanel.system_fqdn);
		            },
		            scope: me
		        }
			});
			me.nagiospanel.loaded=false;
			svTabs.push(me.nagiospanel);
		}
		if(PP.config.enableLogStash)
		{
			svTabs.push(me.logpanel);
		}
		if(PP.config.enableGraphite)
		{
			me.graphPanel=new PP.GraphitePanel();
			svTabs.push(me.graphPanel);
		}

		me.items=[
			{
				xtype:'panel',
				// region:'center',
				frame:true,
				flex: me.layout_view=='horizontal' ? 0 : 1,
				width: me.layout_view=='horizontal' ? 350 : undefined,
				items:[
				{
					xtype:'fieldset',
					defaultType:'textfield',
					autoScroll:true,
					border:false,
					defaults:{
						anchor: '100%'
					},
					items:me.field_config['main']
				}]
			}
			,
			{
				xtype:'tabpanel',
				split:true,
				flex: 2,
				stateful: me.stateful,
				activeTab:0,
				items: svTabs.sort()				
			}
		];
		PP.SystemViewPanel.superclass.initComponent.call(me);
	},
	saveRecord:function(){
		PP.saveRecord(this.getForm().getRecord(),function(){
			if(this.saveButton)
			{
				this.saveButton.disable();
				this.cancelButton.disable();
			}			
		});
	},
	fieldSaveValue:function(f,n,o){
		if(this.loading)
		{
			return;
		}
		if(PP.allowEditing)
		{
			if(f.xtype=='combo' && n==null)
			{
				return;
			}
			if(this.saveButton)
			{
				this.saveButton.enable();				
				this.cancelButton.enable();				
			}
			this.getForm().updateRecord(this.getForm().getRecord());
			return;
		}
	},
	clear:function()
	{
		if(this.getRecord())
		{
			this.saveButton.disable();
			this.cancelButton.disable();	
			this.getForm().reset(true);	
			this.auditpanel.clear();	
			if(this.nagiospanel)
			{
				this.nagiospanel.loaded=false;
			}
		}
	},
	load:function(system)
	{
		this.setLoading(true);
		// PP.log('loading:');
		// PP.log(system);
		// PP.log(typeof system);
		if(typeof system == 'object')
		{
			this.system=system;
		}
		else
		{
			var system_lookup=system;
			PP.log('getting system from backend');
			this.system=Ext.ModelManager.getModel('system');
			this.system.load(system_lookup,{
				scope:this,
				success:function(entry){
					this.load(entry);
				}
			});
			return;
		}
		if(PP.config.jira)
		{
			this.jirapanel.load(this.system.get('fqdn'));
		}
		if(this.nagiospanel)
		{
			this.loadNagios(this.system.get('fqdn'));
		}
		this.auditpanel.load(this.system.get('fqdn'));
		if(PP.config.enableLogStash)
		{
			this.logpanel.load(this.system.get('fqdn'));
		}
		if(this.system.dirty && PP.allowEditing && this.saveButton)
		{
			this.saveButton.enable();
			this.cancelButton.enable();
		}
		if(PP.config.enableGraphite && this.graphPanel)
		{
			this.graphPanel.load(this.system.get('fqdn'));
		}
		else{
			if(this.saveButton)
			{
				this.saveButton.disable();
				this.cancelButton.disable();				
			}
		}
		Ext.Function.defer(this.loadRec,50,this,[this.system]);
		
	},
	// checks to see if combo stores have loaded.
	checkCombos: function(){
		var loading=false;
		this.getForm().getFields().each(function(i){
			// console.log(i.xtype); 
			if(i.xtype=='combo')
			{
				if(i.store.loading)
				{
					loading=true;
					return false;
				}
			}
		});
		return loading;
	},
	loadNagios: function(system_fqdn){
        if(system_fqdn)
        {
            if(this.system_fqdn!=system_fqdn)
            {
                this.nagiospanel.loaded=false;
            }
            this.nagiospanel.system_fqdn=system_fqdn;
        }
        if(!this.nagiospanel.loaded && this.nagiospanel.isVisible() && this.nagiospanel.system_fqdn)
        {
			this.nagiospanel.load(this.nagiospanel.system_fqdn);
			this.nagiospanel.loaded=true;
		}			
	},
	loadRec: function(rec) {
		if(Ext.Ajax.isLoading() || this.checkCombos())
		{
			Ext.Function.defer(this.loadRec,200,this,[rec]);
		}
		else
		{
			this.enable();
			this.loading=true;
			this.getForm().loadRecord(this.system);
			this.loading=false;
			this.setLoading(false);
		}
	}
	
});

