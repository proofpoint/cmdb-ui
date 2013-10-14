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


PP.runPuppet=function(hostname){
// rundeck api call to execute puppet with defined job
	var rundeckPuppetUrl=PP.config['rundeck_path']+ '/api/1/job/' + PP.config['rundeck_puppet_job_id'];
	rundeckPuppetUrl= rundeckPuppetUrl +  '/run?argString=-requestor+' + PP.user.username + '&authtoken=' + PP.config['rundeck_api_token'];
	rundeckPuppetUrl= rundeckPuppetUrl +  '&hostname=' + hostname;
	Ext.Ajax.request({
		method:'GET',
		timeout: 520000,
		url: rundeckPuppetUrl,
		success:function(resp){
			Ext.Msg.hide();
			// PP.notify.msg('Success','Puppet Run iniated via Rundeck');
			PP.response=resp;
			var executionId=Ext.dom.Query.selectNode('execution[id]',resp.responseXML).getAttribute('id');
			PP.jobOutput(PP.config['rundeck_puppet_job_id'],executionId, 'puppet run on ' + hostname);
			// if(resp.responseText)
			// {
			// 	var inst=Ext.decode(resp.responseText);
			// 	var Sys=Ext.ModelManager.getModel('system');
			// }
		},
		failure: function(resp){
			Ext.Msg.alert('Error','Received an error when sending request to rundeck_api: <br> ' + resp.responseText);
		}
	});			
}

PP.jobOutput=function(job,executionId,title){
	var executionUrl=PP.config['rundeck_path']+ '/api/5/execution/' + executionId + '/output';
	var outputGrid= new PP.execOutputGrid();
	var outputWindow=new Ext.Window({
		title: 'Execution Output ' + title,
		height: 400,
		width: 800,
		layout: 'fit',
		items:outputGrid
	});
	outputGrid.store.load({id:executionId});
	outputGrid.store.on('load',function(){
		var lastRecord = outputGrid.store.getCount()-1; 
		// outputGrid.getView().getSelectionModel().selectRow(lastRecord);
		outputGrid.getView().focusRow(lastRecord);     
	});
	outputWindow.show();
	outputGrid.task={
		run: function(){
			outputGrid.store.load({id:executionId});
		},
		interval: 5000
	};
	Ext.TaskManager.start(outputGrid.task);
	outputWindow.on('beforedestroy',function(){
		Ext.TaskManager.stop(outputGrid.task);		
	});
}

Ext.define('execOutput',{
	extend: 'Ext.data.Model',
	fields: [
		{name:'time', mapping:'@time'},
		{name:'level', mapping:'@level'},
		{name:'log', mapping:'@log'},
		{name:'user', mapping:'@user'},
		{name:'command', mapping:'@command'},
		{name:'node', mapping:'@node'}
	],
	proxy: {
		type: 'rest',
		timeout: 150000,
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		filterParam: undefined,
		sortParam: undefined
		// ,
		// url: PP.config['rundeck_path']+ '/api/5/execution/',
		// urlBase: PP.config['rundeck_path']+ '/api/5/execution/'
	}
});

Ext.define('PP.execOutputStore',{
	extend: 'Ext.data.Store',
	model: 'execOutput',
	proxy: {
		type: 'ajax',
		url: PP.config['rundeck_path']+ '/api/5/execution/',
		urlBase: PP.config['rundeck_path']+ '/api/5/execution/',
		reader:{
			type: 'xml',
			record: 'entries > entries',
			root: 'output'
			
		},
		buildUrl:function(request){
			// return 'test.xml';
			var url=this.getUrl(request);
			var me=this;
			if(request.params.id)
			{
				url=url + request.params.id + '/output?authtoken=' +  PP.config['rundeck_api_token'];
			}
			else
			{
				error('Missing output id');
			}
			return url;
		} 
	}
});
Ext.define('PP.execOutputGrid',{
	extend: 'Ext.grid.GridPanel',
	alias: 'execoutputgrid',
	loadMask: true,
	stateful: false,
	autoLoad: false,
	tbar:[
		{
			text:'refreshing every 5 seconds'
		}
	],
	columns:[
		{ text: 'Time', dataIndex:'time', width:60},
		{ text: 'Log Level', dataIndex: 'level', width:60},
		{ text: 'Output',flex: 2, dataIndex: 'log'},
		{ text: 'Exec User', flex: 1, dataIndex: 'user' ,hidden:true},
		{ text: 'Exec Command',flex: 1, dataIndex: 'command', hidden:true},
		{ text: 'Node', flex: 1, dataIndex: 'node', hidden:true}
	],
	store: new PP.execOutputStore
});
