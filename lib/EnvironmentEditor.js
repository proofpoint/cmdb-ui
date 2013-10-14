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

Ext.define('PP.EnvironmentEditor',{
	extend: 'PP.EntityEditorGrid',
	alias: 'widget.environmenteditor',
	entity: 'service_instance',
	startQuery:'*',
	hideKeyField:true,
	stateful:false,
    deleteEnabled: true,
    startQuery: "*",
    lexicon: PP.lexicon,
	store: new Ext.data.Store({
        model: "service_instance",
        autoLoad: false,
        listeners: {
            load: function() {
                this.filterBy(function(record) {
                    return (record.get("type") == "environment") ? true: false;
                });
            }
        },
		sorters:[ {property: 'name', direction: 'ASC'	} ]
    }),
	rec_template:{
		environment_name: PP.config.default_environment,
		type: 'environment'
	},

	listeners:{
		destroy: function(){
			Ext.StoreManager.get("environment_name_store").load(function() {
		        this.fireEvent("load");
		    });
		}
	},
	initComponent: function(){
		this.columns=[];
		this.columns.push(this.columnConfig('name'));
		this.columns[0].header='Name';
		this.columns[0].editor.allowBlank=false;
		this.columns[0].editor.vtype='alphanum';
		this.columns.push(this.columnConfig('note'));
		this.columns.push(this.columnConfig('environment_name'));
		this.columns[2].header='Parent Environment';
		this.columns[2].editor.allowBlank=false;
		this.tbar=[{
			xtype: 'button',
			scope:this,
		    text: 'Create New Environment',
		    handler: this.buttonHandler
		}];
		this.mode='other';
		
		PP.EnvironmentEditor.superclass.initComponent.call(this);
	},
	deleteRecord: function(id){
			
		if( this.store.getById(id) )
		{
			var rec=this.store.getById(id);
			Ext.Msg.confirm('Confirm','Are you sure you want to delete this record?<br>This cannot be undone',function(btn){
				if(btn == 'yes')
				{
					var rec=this.store.getById(id);
					var recname=rec.get('name');
					Ext.Msg.show({
						msg:'Deleting Env in Puppet Repo<br>(this will take a minute)',
						progressText: 'updating...',
						width: 200,
						wait: true,
						waitConfig: {interval: 200}
					});
					Ext.Ajax.request({
						url:'/env/' + recname,
						method: 'DELETE',
						timeout: 300000,
						scope: this,
						success: function(){
							this.store.remove(rec);
							rec.destroy({
								success: function(){
									Ext.StoreManager.get("environment_name_store").load(function() {
								        this.fireEvent("load");
								    });
									Ext.Msg.hide();
									PP.notify.msg('Deleted','Environment has been deleted.');
								},
								failure: function(op){
									Ext.Msg.alert('Error', 'There was an error deleting the record in the remote store' + "<br>" + op.response.responseText);
								}
							});										
						},
						failure: function(resp){
							Ext.Msg.alert('Error','There was an error when deleting the environment from the puppet repo. Please report this.'  + "<br>" + resp.responseText);
						}
					});	
				}
			},this);		    
		}
	},
	buttonHandler:function(b){
		if(!PP.allowEditing)
		{
		//	return;
		}
		else
		{
			var w=new Ext.Window({
				title: 'New Environment',
				height: 200,
				width: 400,
				layout: 'border',
				modal: true,
				plain: true,
				closeAction:'destroy',
				items:[
					{
						xtype: 'form',
						region: 'center',
						bodyStyle:'padding:13px;',
						layout: { type: 'vbox'},
						fieldDefaults: {
				            anchor: '100%'
				        },
						items:[
							{
								xtype: 'hidden',
								name: 'type',
								value: 'environment'
							},
							{
								xtype: 'textfield',
								fieldLabel: 'Name',
								name: 'name',
								allowBlank: false,
								vtype: 'alphanum'
							},
							{
								xtype: 'textfield',
								fieldLabel: 'Note',
								name: 'note'
							},
							{
								xtype: 'combo',
								allowBlank: false,
								name: 'environment_name',
								store: Ext.StoreManager.get('environment_name_store'),
								fieldLabel: 'Parent Environment',
								labelWidth: 170,
								displayField: 'name',
								valueField: 'name',
								value: PP.config.default_environment,
								emptyText: 'select to filter',
								// value:'pic',
								listeners:{
									'expand': {
										scope: this,
										fn: function(combo){
											combo.store.clearFilter();
										}
									}
								}
							}							
						],
						buttons:[
							{
								text:'Create',
								scope: this,
								handler:function(b,e){
									var env=b.up('form').getForm().getValues();
									var p = Ext.ModelManager.create( env ,'service_instance');
									Ext.Msg.show({
										msg:'Saving Env in Puppet Repo<br>(this will take a minute)',
										progressText: 'updating...',
										width: 200,
										wait: true,
										waitConfig: {interval: 200}
									});
									Ext.Ajax.request({
										url: PP.config.env_api_path + env.name,
										method: 'PUT',
										scope: this,
										timeout: 150000,
										jsonData: { name: env.name, parent: env.environment_name },
										success: function(){
											p.save({
												success: function(){
													PP.notify.msg('Success','Environment has been saved.');
													Ext.Msg.hide();
													this.store.load();
													Ext.StoreManager.get("environment_name_store").load(function() {
												        this.fireEvent("load");
												    });
												},
												failure:function(recs,op,success){
													if(!op.success)
													{
														Ext.Msg.alert("Error",'Server returned ' + op.error.status + ": " + op.error.statusText + "<br>" + op.response.responseText);
													}
												},
												scope: this
											});
										},
										failure: function(resp){
											Ext.Msg.alert('Error','There was an error when saving the environment for puppet in repo. Please report this.' + "<br>" + resp.responseText);
				
										}
									});
									b.up('window').close();
									
								}
							},
							{
								text: 'Cancel',
								handler: function(){
									this.up('window').close();
								}
							}
						]
						
					}
				]
			});
			w.show();
			return;
			var p = Ext.ModelManager.create({type:'environment'},this.entity);
			if(this.rec_template)
			{
				PP.log(this.rec_template);
				for (i in this.rec_template)
			    {
					if(typeof this.rec_template[i] =='function')
					{
						p.set(i,this.rec_template[i]());
						continue;
					}
					p.set(i,this.rec_template[i]);
				}
			}
	        this.store.insert(0, p);
	        this.editingPlugin.startEdit(p, this.columns[0]);
	    }
	}
	
});
