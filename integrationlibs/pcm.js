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

Ext.define('instance',{
	extend: 'Ext.data.Model',
	fields: ['id','size','image','extra'],
	proxy: {
		type: 'rest',
		timeout: 150000,
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		sortParam: undefined,
		filterParam: undefined,
		url: PP.config.pcm_api_path +'v2/',
		urlBase: PP.config.pcm_api_path +'v2/'
	}
});
 
Ext.define('instance_size',{
	extend: 'Ext.data.Model',
	fields: ['id','provider','name','description','price','ram','cores','disk'],
	proxy: {
		type: 'rest',
		timeout: 150000,
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		sortParam: undefined,
		filterParam: undefined,
		url: PP.config.pcm_api_path + 'v2/sizes',
		urlBase: PP.config.pcm_api_path +'v2/'
	}
})

PP.instance_size_store = new Ext.data.Store({
	model: 'instance_size',
	autoLoad:true
});

Ext.define('instance_image',{
	extend: 'Ext.data.Model',
	fields: ['id','operatingsystemrelease','name','description','cost','operatingsystem','osfamily','provider_id'],
	proxy: {
		type: 'rest',
		timeout: 150000,
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		sortParam: undefined,
		filterParam: undefined,
		url: PP.config.pcm_api_path + 'v2/sizes',
		urlBase: PP.config.pcm_api_path +'v2/'
	},
})

PP.instance_image_store = new Ext.data.Store({
	model: 'instance_image',
	autoLoad:true
});

Ext.define('instanceLocationModel',{
	extend: 'Ext.data.Model',
	fields: [ {name: 'name', convert: function(value,record){
		return record.raw;
	}} ],
	proxy: {
		type: 'rest',
		reader: 'array',
		timeout: 150000,
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		sortParam: undefined,
		filterParam: undefined,
		url: PP.config.pcm_api_path + 'v2/clouds'
	}
});
PP.instanceLocationStore=Ext.create('Ext.data.Store',{
	storeId: 'instanceLocations',
	model: 'instanceLocationModel',
	autoLoad:true
});

PP.showInstanceConsole=function(sys)
{
	var p=new Ext.Panel({
		xtype: 'panel',
		region: 'center',
		autoScroll: true,
		loader:{
			url: PP.config.pcm_api_path + 'v2/clouds/' + sys.data.cloud + '/instances/' + sys.data.serial_number + '/console_log',
			autoLoad: false,
			loadMask: true,
			renderer: function(loader, response, active){
				var text = response.responseText;
	            loader.getTarget().update('<pre>' + text + '</pre>');
	            return true;
			}
		}
	});
	var w=new Ext.Window({
			title: 'Instance Console: ' + sys.data.fqdn,
			height: 600,
			width: 800,
			layout: 'border',
			modal:true,
			plain:true,
			closeAction:'destroy',
			items: p
		});
	w.show();
	p.setLoading(true);
	p.getLoader().load({
		callback: function(){
			this.setLoading(false);
		},
		scope: p
	});
}
PP.rebootInstance=function(sys)
{
	Ext.MessageBox.show({
		msg:'Rebooting Prism Instance',
		progressText: 'sending reboot request...',
		width: 200,
		wait: true,
		waitConfig: {interval: 200}
	});
	Ext.Ajax.request({
		method:'PUT',
		timeout: 520000,
		url: PP.config.pcm_api_path + 'v2/clouds/' + sys.data.cloud + '/instances/' + sys.data.serial_number,
		jsonData: '{"status":"reboot"}',
		success:function(resp){
			Ext.Msg.hide();
			PP.notify.msg('Success','Reboot request has been accepted');

			///// not sure if these two lines are needed with pcmapiv2
			// sys.set('status','terminating');
			// sys.save();


			// if(resp.responseText)
			// {
			// 	var inst=Ext.decode(resp.responseText);
			// 	var Sys=Ext.ModelManager.getModel('system');
			// }
		},
		failure: function(resp){
			Ext.Msg.alert('Error','Received an error when sending reboot request to pcm_api: <br> ' + resp.responseText);
		}
	});			
}
PP.terminateInstance=function(sys)
{
	
	var instanceUUID=sys.data.serial_number;
	var data_center_code=sys.data.data_center_code;
//TODO need to make this work better.  maybe use data_center_code
	if(!sys.data.data_center_code)
	{
		if(instanceUUID.match(/^i-/))
		{
			data_center_code='AWSLAB';
		}
		else
		{
			data_center_code=PP.defaultLocation;
			if(instanceUUID.length < 32 )
			{
				PP.log('instance UUID not long enough: ' + instanceUUID)
			}
		}
	}
	
	Ext.MessageBox.show({
		msg:'Terminating Prism Instance',
		progressText: 'sending terminate request...',
		width: 200,
		wait: true,
		waitConfig: {interval: 200}
	});
	Ext.Ajax.request({
		method:'DELETE',
		timeout: 520000,
		url: PP.config.pcm_api_path + 'v2/clouds/' + sys.data.cloud + '/instances/' + instanceUUID,
		success:function(resp){
			Ext.Msg.hide();
			PP.notify.msg('Success','Terminate request has been accepted');

			///// not sure if these two lines are needed with pcmapiv2
			// sys.set('status','terminating');
			// sys.save();


			// if(resp.responseText)
			// {
			// 	var inst=Ext.decode(resp.responseText);
			// 	var Sys=Ext.ModelManager.getModel('system');
			// }
		},
		failure: function(resp){
			Ext.Msg.alert('Error','Received an error when sending terminate request to pcm_api: <br> ' + resp.responseText);
		}
	});			
}
PP.createNewInstance=function(config)
{
	Ext.MessageBox.show({
		msg:'Creating Instance',
		progressText: 'Initializing...',
		width: 200,
		wait: true,
		waitConfig: {interval: 200}
	});

	var newSys=Ext.create('instance',config);
	newSys.proxy.url=newSys.proxy.urlBase + 'clouds/' + config.cloud + '/instances';
	newSys.save({callback:function(r,op){
		if(op.response && op.response.status==201)
		{
			Ext.MessageBox.hide();
			var sys=Ext.decode(op.response.responseText);
			Ext.MessageBox.show({
				title: 'Instance Created',
				icon: Ext.MessageBox.INFO,
				msg: 'Instance ' + sys.name + ' has been started.',
				buttons: Ext.MessageBox.OKCANCEL,
				buttonText:{
					ok: 'Lookup ' + sys.name
				},
				fn: function(btn){
					if(btn == 'ok')
					{
					Ext.getCmp('system_grid').loadSearch(['status!=decommissioned','fqdn~' + sys.name]);
					}
				}
			});



			// Ext.Ajax.request({
			// 	url: op.response.getResponseHeader('location').replace(/http:\/\/.*?\//,PP.config.pcm_api_path),
			// 	timeout: 520000,
			// 	success:function(resp){
			// 		if(resp.responseText)
			// 		{
			// 			var Sys=Ext.ModelManager.getModel('system');
			// 			Sys.load(inst.hostname,{
			// 				success:function(system){

			// 					//  no longer needed with pcm_api v2
			// 					////////////
			// 					// if(config.role)
			// 					// {
			// 					// 	system.set('roles',config.role);
			// 					// }
			// 					// if(config.tags)
			// 					// {
			// 					// 	system.set('tags',config.tags.toUpperCase().replace(/\s/,'_'));
			// 					// }
			// 					// system.set('status','building');
			// 					// if(config.data_center_code)
			// 					// {
			// 					// 	system.set('data_center_code',config.data_center_code);
			// 					// }
			// 					// system.set('created_by',PP.user.username);
			// 					// system.set('environment_name',config.environment_name);
			// 					// system.save({
			// 					// 	callback: function(recs){
			// 							// Ext.MessageBox.hide();
			// 							// var instanceName=system.get('fqdn');
			// 							// Ext.MessageBox.show({
			// 							// 	title: 'Instance Created',
			// 							// 	icon: Ext.MessageBox.INFO,
			// 							// 	msg: 'Instance ' + instanceName + ' has been started.',
			// 							// 	buttons: Ext.MessageBox.OKCANCEL,
			// 							// 	buttonText:{
			// 							// 		ok: 'Lookup ' + instanceName
			// 							// 	},
			// 							// 	fn: function(btn){
			// 							// 		if(btn == 'ok')
			// 							// 		{
			// 							// 			Ext.getCmp('system_grid').loadSearch(['status!=decommissioned','fqdn~' + instanceName]);
			// 							// 		}
			// 							// 	}
			// 							// });
			// 					// 	}
			// 					// });
			// 				},
			// 				failure: function(){
			// 					Ext.MessageBox.hide();
			// 					Ext.Msg.alert("Error",'Failed to find new instance in inventory.  Server returned ' + op.error.status + ": " + op.error.statusText);								
			// 				}
			// 			});						
			// 		}
			// 	},
			// 	failure: function(){
			// 		Ext.MessageBox.hide();
			// 		Ext.Msg.alert("Error",'Failed to lookup instance against the PCM API.  Server returned ' + op.error.status + ": " + op.error.statusText);													
			// 	}
			// });			
		}
		else // create instance didn't work. hide the status and show an error dialog
		{
			Ext.MessageBox.hide();
			Ext.Msg.alert("Error",'Creating instance failed.  Server returned ' + op.error.status + ": " + op.error.statusText + "<br>" + op.response.responseText);
		}
	}});
	// setTimeout(function(){
	// 	Ext.MessageBox.hide();
	// },3000);
	
}

PP.makeInstanceRequest=function(config){
	var instanceRequest={};
	var err = new Object();
	err.badElements = new Array();
	err.message = "";
	if(config.location == null || config.location == '') {
		err.badElements.push('location');
		err.message += 'Location is required\n';
	} else {
		instanceRequest.cloud=config.location;
	}
        
//// this will need to be modified more as pcm_apiv2 adds things like auth.
	if(config.sizeName != null && config.sizeName != "") {
		instanceRequest.size=config.sizeName;
	}
	if(config.image != null && config.image != "") {
 
		instanceRequest.image=config.image;
	}
	instanceRequest.extra={
		inventory: {
			created_by: PP.user.username,
			tags: config.tags,
			environment_name: config.environment_name,
			roles: config.role
		}
		
	};
	if(config.subnet != null && config.subnet != '') {
		instanceRequest.extra = 
			Ext.merge(instanceRequest.extra,
				  Ext.decode("{\"aws\":{\"subnet_id\":\"" + config.subnet + "\" }}"));	
	} 
	if(config.hints != null && config.hints != '') {

		try {
			instanceRequest.extra = 
				Ext.merge(instanceRequest.extra,Ext.decode(config.hints));

		} catch (hintsErr) {
			err.badElements.push('hints');
			err.message += "Error decoding hints:" + hintsErr;			
		}
	}

	if (err.badElements.length > 0) throw(err);
	return instanceRequest;
}

PP.newInstanceWindow=function (){
	PP.instance_size_store.load();
	PP.instanceLocationStore.load();
	var new_instance_env_combo=PP.getEditorConfig('environment_name',{entity:'system',labels:true});
	new_instance_env_combo.value=PP.config.default_environment || null;
	new_instance_env_combo.store.load();
	var newinstance_window=new Ext.Window({
		title: 'New PRISM Instance',
		height: 275,
		width: 400,
		layout: 'border',
		modal:true,
		plain:true,
		closeAction:'destroy',
		items:{
			xtype:'form',
			region: 'center',
			bodyStyle:'padding:13px;',
			layout: {
				type:'vbox',
				align: 'stretch'
			},
			fieldDefaults: {
	            anchor: '100%'
	        },
			items:[
				{
					xtype:'hidden',
					name: 'username',
					value: PP.user.username
				},
				new_instance_env_combo,
				{
					xtype:'combo',
					fieldLabel: 'Location',
					emptyText: 'choose one...',
					id: 'location_chooser',
					name: 'location',
					forceSelection:true,
					valueField: 'name',
					displayField: 'name',
					queryMode: 'local',
					store: PP.instanceLocationStore,
					listeners:{
						'focus': {
							fn: function(){ this.expand(); }
						},
						'change': {
							fn: function(combo,newval,oldval){
								if( newval != oldval)
								{
									Ext.getCmp('sizeSelector').clearValue();
                                    Ext.getCmp('sizeSelector').enable();
                                    PP.instance_size_store.proxy.url=PP.instance_size_store.proxy.urlBase + 'clouds/' + newval + '/sizes';
									PP.instance_size_store.load();
									Ext.getCmp('image_chooser').clearValue();
                                    Ext.getCmp('image_chooser').enable();
                                    PP.instance_image_store.proxy.url=PP.instance_image_store.proxy.urlBase + 'clouds/' + newval + '/images';
                                    PP.instance_image_store.load();
								}
							}
						}
					}
				},
				{
					xtype: 'combo',
					name: 'sizeName',
					id: 'sizeSelector',
					fieldLabel: 'Size',
					valueField: 'id',
					displayField: 'id',
					emptyText: 'choose one...',
					forceSelection:true,
					triggerAction:'all',
					selectOnFocus:true,
					queryMode:'local',
					listeners:{
						focus: function(){
							this.expand(); 
						}
					},
					// store: Ext.create('Ext.data.Store', {
					// 	storeId:'sizeSelectionStore',
					//     fields: ['id', 'name','description']
					// }),
					store: PP.instance_size_store,
					listConfig: {
						getInnerTpl:  function() {
							var tm=  '<tpl for=".">'
								+'<div class="x-combo-list-item">'
								+'<div class="ux-lovcombo-item-text">{id}</div>'
								+'<div class="ux-lovcombo-item-smalltext">cores: {cores} ram: {ram} MB disk: {disk} GB  (${price}/mo)</div>'
								+'</div>'
								+'</tpl>';
							return tm;
						}
					}
				},
				{
					xtype:'combo',
					fieldLabel: 'Image',
					id: 'image_chooser',
					name: 'image',
					forceSelection:true,
					valueField: 'id',
					displayField: 'description',
					emptyText: 'choose one...',
					forceSelection:true,
					triggerAction:'all',
					selectOnFocus:true,
					queryMode:'local',
					store:PP.instance_image_store,
					listeners:{
						'focus': {
							fn: function(){ this.expand(); }
						}
					}
				},
				//Commenting out roles until we can speed up the initial puppet run
				/*{
					xtype: 'combo',
					name: 'role',
					fieldLabel: 'Role',
					// disabled: true,
					allowEmpty:true,
					multiSelect:true,
					emptyText:'',
					displayField:'role_id',
					valueField: 'role_id',
					triggerAction:'all',
					listeners:{
						focus: function(){ this.expand(); }
					},
					selectOnFocus: true,
					queryMode:'local',
					listConfig:  {
						getInnerTpl:  function() {
							var tm=  '<tpl for=".">'
								+'<div class="x-combo-list-item">'
							+'<div class="ux-lovcombo-item-text">{role_id}</div>'
							+'<div class="ux-lovcombo-item-smalltext">{role_name}</div>'
							+'</div>'
							+'</tpl>';
							return tm;
						}
					},
					store: new Ext.data.Store({
						model: 'role',
						autoLoad:true,
						proxy: {
							type: 'ajax',
							url: PP.config.inv_api_path + 'role/',
							startParam: undefined,
							pageParam: undefined,
							limitParam: undefined,
							sortParam: undefined,
							filterParam: undefined,
							method: 'GET'
						}
					})
				},*/
				{
					xtype: 'textfield',
					name: 'tags',
					value: '',
					fieldLabel: 'Tag'
				},
				{
					xtype: 'combo',
					fieldLabel: 'Network (AWS)',
					id: 'subnet_chooser',
					name: 'subnet',
					forceSelection:true,
					valueField: 'subnet_id',
					displayField: 'subnet_name',
					emptyText: 'choose one...',
					forceSelection:true,
					triggerAction:'all',
					selectOnFocus:true,
					store: Ext.create('Ext.data.Store', {
						storeId:'subnetSelectionStore',
						fields: ['subnet_id', 'subnet_name'],
						data: PP.config.awsSubnets
						}
					)
				},
				{
					xtype: 'textfield',
					name:  'hints',
					value: '',
					fieldLabel: 'Hints (Advanced)',
				}
			],
			buttons:[
				{
					text:'Create',
					handler:function(){
                                                var myForm = this.up('form').getForm();
						try {
							PP.createNewInstance( PP.makeInstanceRequest( this.up('form').getForm().getValues() ) );
						} catch (err) {
							alert(err.message);
							for(i=0; i<err.badElements.length; i++){
								this.up('form').getForm().findField(err.badElements[i]).markInvalid('Not valid');
							}
							return;
						}
						this.up('window').close();
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
		
	});
	console.log(newinstance_window);
	newinstance_window.show();
}
