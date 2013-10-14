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



Ext.define('PP.ServiceViewPanel',{
	extend:'Ext.FormPanel',
	require:'Ext.grid.Panel',
	alias: 'widget.serviceviewpanel',
	frame:true,
	entity:'service_instance',
	data_entity: 'service_instance_data',
	layout_view:'vertical',
	service:{},
	defaultType:'textfield',
	layout:'border',
	maskDisabled:false,
	editing:false,
	tbar:[],
	deleteServiceInstanceDataRecord: function(id){
		if( this.grid.store.getById(id) )
		{
			Ext.Msg.confirm('Confirm','Are you sure you want to delete this record?<br>This cannot be undone',function(btn){
				if(btn == 'yes')
				{
					var rec=this.grid.store.getById(id);
					this.grid.store.remove(rec);
					rec.destroy({
						success: function(){
							PP.notify.msg('Success', 'Record deleted');
							this.loadData();
						},
						failure: function(op){
							Ext.Msg.alert('Error', 'There was an error deleting the record in the remote store' + "<br>" + op.response.responseText);
						},
						scope: this
					});					
				}
			},this);
		}
	},
	reset: function(){
		this.getForm().reset();
	},
	initComponent: function(){
		this.saveButton=new Ext.Button({
			icon:'/extjs/examples/shared/icons/save.gif',
			cls:'x-btn-text-icon',
			// disabled:true,
			text:'Save',
			scope:this,
			handler:this.saveRecord
		});
		if(this.editing)
		{
			//this.tbar.push(this.saveButton);			
		}
		this.dataStore=new Ext.data.Store({
			model: this.data_entity
		});
		this.lookup_dataStore=new Ext.data.Store({
			model: this.data_entity
		});
		this.grid=new Ext.grid.Panel({
			// xtype:'gridpanel',
			region: 'center',
			title: 'Properties',
			store: this.dataStore,
			panel: this,
			selType: 'rowmodel',
			viewConfig:{
				getRowClass:function(rec,indx,dep,store){
					if(rec.get('svc_id') != Ext.getCmp('service_view').selectedService.get('svc_id'))
					{					
						return 'inherited';
					}
				}
			},
			plugins: ( this.editing ? [
   				Ext.create('Ext.grid.plugin.RowEditing', {
				    clicksToEdit: 2,
				    autoCancel: false,
				    listeners: {
				        beforeedit: {
							scope: this,
							fn: function(ed,e) {
								if(!PP.allowEditing)
								{
									return false;
								}
								if( e.record.get('svc_id') != this.selectedService.get('svc_id') )
								{
									Ext.Msg.show({
										title: 'Create Override?',
										msg: 'An override value in your environment will allow you to define different service settings',
										buttons: Ext.Msg.YESNO,
										icon: Ext.Msg.QUESTION,
										fn:function(btn){
											if(btn == 'yes')
											{
												// create a override service record for this environment, take values from parent service record
												// then add it, remove the parent (so its not shown) save it and reload so it can be edited
												var p = Ext.ModelManager.create({
													data_key:e.record.get('data_key'),
													data_value:e.record.get('data_value'),
													svc_id: this.selectedService.get('svc_id')
												}, this.data_entity);
										        this.dataStore.insert(0, p);
												p.save({
													callback: function(){
														this.loadData();
													},
													scope: this
												});					
											}	
										},
										scope: this
									});
									return false;
								}
							}
				        },
			            cancelEdit: function(rowEditing, context) {
			                // Canceling editing of a locally added, unsaved record: remove it
			                if (context.record.phantom) {
			                    me.store.remove(context.record);
			                }
			            },
				        edit:{
						scope: this,
						fn:function(ed, e) {
					            if (PP.allowEditing)
					            {
					                // if (e.store.find('data_key', e.newValues.data_key) == -1)
					                // {
							e.record.save({
								success: function(){
									e.record.commit();
									PP.notify.msg('Success', 'Record saved');
									this.loadData();
								},
								failure:function(recs,op,success){
									if(!op.success)
									{
										Ext.Msg.alert("Error",'Server returned ' +
										 op.error.status + ": " +
										 op.error.statusText + "<br>" +
										 op.response.responseText
									);
									e.record.reject();
									}
								},
								scope: this
							});
					                // }
					                // else
					                // {
					                //     Ext.Msg.alert('Error', 'There is already a setting with this name');
					                //     e.store.remove(e.store.getAt(e.rowIdx));
					                //     return false;
					                // }
					            }
						}
				        }
				    }
				})

			] : undefined ),
		    columns:[
				{header: 'Name', dataIndex: 'data_key', field: 'textfield',flex:1},
				{header: 'Value', dataIndex: 'data_value', field: 'textfield',flex:1},
				{header: '',dataIndex: 'data_id', renderer:function(v,meta,rec){ 
					if(this.up('serviceviewpanel').selectedService.get('svc_id') == rec.get('svc_id'))
					{
						return '<span style="font-size:10px;cursor: pointer;color:#666;" onclick="Ext.getCmp(\'' + this.up('serviceviewpanel').getId() + '\').deleteServiceInstanceDataRecord(\'' + v + '\');">Delete</span> ';
					}
				}, width: 47}
			],
			tbar: (this.editing ? [
				{
					text: 'New',
					handler: function(){
						var p = Ext.ModelManager.create({}, this.data_entity);
						var g=this.grid;	
						var svp=this;
						if(svp.saveButton)
						{
							svp.saveButton.enable();
						}
						
						if(g.panel.getForm().getRecord())
						{
							p.set('svc_id',g.panel.getForm().getRecord().get('svc_id'));
							g.store.insert(0, p);
					        g.editingPlugin.startEdit(p, g.columns[0]);							
						}
					},
					scope: this
				}
			] : undefined)
		});
		
		this.items=[
			{
				region: 'north',
				height: 140,
				xtype:'fieldset',
				defaultType:'textfield',
				defaults:{
					anchor: '100%'
				},
				items:[
					{
						fieldLabel: 'SVC ID',
						xtype:'hidden',
						name: 'svc_id'
					},
					{
						fieldLabel: 'Name',
						name: 'name'
					},
					{
						fieldLabel: 'Type',
						name: 'type'
					},
					{
						fieldLabel: 'Note',
						name: 'note'
					}
				]
			},
			this.grid
		];
		var env_name_field=PP.getEditorConfig('environment_name',{entity:this.entity});
		env_name_field.xtype='displayfield';
		this.items[0].items.push(env_name_field);
		PP.ServiceViewPanel.superclass.initComponent.call(this);
	},
	saveRecord:function(){
		if(PP.allowEditing && this.getForm().getRecord())
		{
			var rec = this.getForm().getRecord();
			rec.commit();
			rec.save({
				success: function(){
					PP.notify.msg('Success', 'Record Saved');
					//this.grid.store.sync();
				},
				failure: function(op){
					Ext.Msg.alert('Error', 'There was an error saving the record in the remote store' + "<br>" + 
							op.response.responseText
						     );
				}
			});

			if(this.saveButton)
			{
				this.saveButton.disable();
			}
		}
	},
	loadData: function(){
		var i=this.selectedService;
		var svc_id_lkup=[];
		svc_id_lkup.push(i.get('svc_id'));
		while(i.parent)
		{
			i=i.parent;
			svc_id_lkup.push(i.get('svc_id'));
		}
		this.grid.setLoading(true);
		this.grid.store.loadData([],false);
		// fetch all the data records for this service and it's parents, then add them in reverse order
		// overriding existing values that come from parents
		Ext.Ajax.request({
			url: PP.config.inv_api_path + this.data_entity + '?svc_id~^' + svc_id_lkup.join('|^'),
			method: 'GET',
			scope: this,
			success: function(resp,opts){
				if(resp.responseText.length > 0)
				{
					var records=Ext.decode(resp.responseText);
					Ext.each(svc_id_lkup,function(svc_id){
						Ext.each(records,function(rec){
							if(rec.svc_id==svc_id)
							{
								var dataentry=Ext.create(this.data_entity,rec);
								if(lkup_rec=this.dataStore.findRecord('data_key',dataentry.get('data_key'),0,false,true,true))
								{
									var idx=this.dataStore.indexOf(lkup_rec);
									this.dataStore.remove(lkup_rec);
									dataentry.parent=lkup_rec;
									this.dataStore.insert(idx,[dataentry]);
								}
								else
								{
									this.dataStore.add(rec);
								}
							}							
						},this);
					},this,true);
					this.dataStore.sort();
				}
				this.grid.setLoading(false);			
			},
			failure: function(resp){
				Ext.Msg.alert('Error','There was an error fetching the attributes for this service' + "<br>" + resp.responseText);
			}
		});
	},
	load: function(svc){
		this.selectedService=svc;
		this.loadRecord(svc);
		this.loadData();
		// this.grid.store.load({params:{svc_id:svc.get('svc_id')}});
	}
});
