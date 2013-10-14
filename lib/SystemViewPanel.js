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
	fields:['fqdn','status','system_type','inventory_component_type','roles','ip_address','environment_name','svc_id','notes'],
	hw_fields:['asset_tag_number','mac_address','hardware_class','data_center_code','cage_code','rack_code','rack_position','manufacturer','product_name','serial_number','blade_chassis_serial','drac','drac_version','drac_macaddress','bios_version','bios_vendor','physical_processor_count','processors','warranty_info','power_supply_count','power_supply_watts','memory_size','disk_drive_count','raidtype','raidcontroller','raidvolumes','raiddrivestatus','raidbaddrives','raiddrives'],
	conf_fields:['config_agent_status','config_agent_summary','config_agent_timestamp','config_agent_output'],
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
		if(this.layout_view=='vertical')
		{
			this.layout = { type: 'vbox',align: 'stretch' };
		}
		else
		{
			this.layout = { type: 'hbox',align: 'stretch'	};
		}
		this.field_config=[];
		this.remaining_fields=[];
		this.hardware_fields=[];
		this.config_fields=[];
		this.fieldchk={};
		if(PP.config.jira)
		{
			this.jirapanel=new PP.JiraGridPanel({title:'Jira'});			
		}
		this.auditpanel=new PP.AuditPanel();
		if(PP.config.enableLogStash)
		{
			this.logpanel=new PP.LogPanel();

		}
		// initialize main form fields
		Ext.each(this.fields,function(item){
			var tmp=PP.getEditorConfig(item,{entity:'system',labels:true});
			tmp['instance']=this;
			if(tmp['listeners'])
			{
				tmp.listeners.change=this.fieldSaveValue;
				tmp.listeners.scope=this;
			}
			else
			{
				tmp.listeners={'change':this.fieldSaveValue,scope:this};
			}
			this.field_config.push(tmp);
			this.fieldchk[item]=true;
		},this);
		// initialize hardware fields
		Ext.each(this.hw_fields,function(item){
			var tmp=PP.getEditorConfig(item,{entity:'system',labels:true});
			tmp['instance']=this;
			if(tmp['listeners'])
			{
				tmp.listeners.change=this.fieldSaveValue;
				tmp.listeners.scope=this;
			}
			else
			{
				tmp.listeners={'change':this.fieldSaveValue,scope:this };
			}
			this.hardware_fields.push(tmp);
			this.fieldchk[item]=true;
		},this);
		//initialze config mgmt fields
		Ext.each(this.conf_fields,function(item){
			var tmp=PP.getEditorConfig(item,{entity:'system',labels:true});
			tmp['instance']=this;
			if(tmp['listeners'])
			{
				tmp.listeners.change=this.fieldSaveValue;
				tmp.listeners.scope=this;
			}
			else
			{
				tmp.listeners={'change':this.fieldSaveValue,scope:this };
			}
			tmp.xtype='displayfield';
			if(tmp.name=='config_agent_output')
			{
				tmp.labelAlign='top';
				tmp.fieldCls='puppet-output'
				tmp.renderer=PP.renderPuppetOutput;
				tmp.listeners= {
		        	click: {
		        	    element: 'el', //bind to the underlying el property on the panel
			            fn: function(){ console.log('click el'); }
			        },
			    }
			}
			this.config_fields.push(tmp);
			this.fieldchk[item]=true;
		},this);
		// initialize remaining fields
		Ext.each(PP.getEntityFields(this.entity),function(item){
			if(this.fieldchk[item]==true || item == null || item.length < 2)
			{
				return;
			}
			var tmp=PP.getEditorConfig(item,{entity:'system',labels:true});
			tmp['instance']=this;
			if(tmp['listeners'])
			{
				tmp.listeners.change=this.fieldSaveValue;
				tmp.listeners.scope=this;
			}
			else
			{
				tmp.listeners={'change':this.fieldSaveValue,scope:this};
			}
			if(tmp.name=='date_created' || tmp.name=='date_modified')
			{
				tmp.xtype='displayfield';
			}
			this.remaining_fields.push(tmp);
		},this);
		this.saveButton=new Ext.Button({
			icon:'images/save.gif',
			cls:'x-btn-text-icon',
			disabled:true,
			text:'Save',
			scope:this,
			handler:this.saveRecord
		});
		this.cancelButton=new Ext.Button({
				xtype: 'button',
				text: 'Cancel',
				disabled: true,
				handler: function(){
					this.system.reject();
					this.load(this.system);
				},
				scope: this
			});

		this.tbar=[
			{
				xtype:'button',
				icon: 'images/icon_popout.gif',
				handler: function(){
					if(this.getRecord() && this.getRecord().get('fqdn'))
					{
						this.collapse();
						PP.systemWindow(this.getRecord().get('fqdn'));						
					}
				},
				scope: this
			},
			{
				xtype:'tbfill'
			},
			this.saveButton,
			this.cancelButton,
		];
		var svTabs=[
			{
				xtype:'panel',
				title:'HW Info',
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
					items:this.hardware_fields
				}
				]
			},
			{
				xtype:'panel',
				title:'More Data',
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
						items: this.remaining_fields
					}
				]
			},
			{
				xtype: 'panel',
				title: 'Puppet',
				layout: 'fit',
				frame: true,
				labelAlign:'top',
				items: [
					{
						xtype:'fieldset',
						baseCls:'',
						autoScroll: true,
						defaults:{
							anchor: '95%'
						},
						defaultType:'textfield',
						items: this.config_fields
					}
				]
			},
			this.auditpanel
		];
		if(PP.config.jira)
		{
			svTabs.push(this.jirapanel);
		}
		if(this.addNagiosPanel)
		{
			this.nagiospanel=Ext.create('NagUI.NagiosGridPanel',{
				viewConfig: { loadMask: true}
			});
			this.nagiospanel.addListener({
		        'activate':{
		            fn: function(p){
		                this.loadNagios(this.nagiospanel.system_fqdn);
		            },
		            scope: this
		        },
		        'boxready':{
		            fn: function(p){
		                this.loadNagios(this.nagiospanel.system_fqdn);
		            },
		            scope: this
		        }
			});
			this.nagiospanel.loaded=false;
			svTabs.push(this.nagiospanel);
		}
		if(PP.config.enableLogStash)
		{
			svTabs.push(this.logpanel);
		}
		if(PP.config.enableGraphite)
		{
			this.graphPanel=new PP.GraphitePanel();
			svTabs.push(this.graphPanel);
		}

		this.items=[
			{
				xtype:'panel',
				// region:'center',
				frame:true,
				flex: this.layout_view=='horizontal' ? 0 : 1,
				width: this.layout_view=='horizontal' ? 350 : undefined,
				items:[
				{
					xtype:'fieldset',
					defaultType:'textfield',
					autoScroll:true,
					border:false,
					defaults:{
						anchor: '100%'
					},
					items:this.field_config
				}]
			}
			,
			{
				xtype:'tabpanel',
				split:true,
				flex: 2,
				stateful: this.stateful,
				activeTab:0,
				items: svTabs						
			}
		];
		PP.SystemViewPanel.superclass.initComponent.call(this);
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

