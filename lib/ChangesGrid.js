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

Ext.define('changes',{
	extend: 'Ext.data.Model',
	fields:["id", "change_ip", "change_user", "change_time", 
		"entity", "entity_key", "change_content",
		{ name: "changes", defaultValue:'loading...'}
	],
	idProperty:'id',
	proxy:{
		type: 'rest',
		startParam: undefined,
		pageParam: undefined,
		limitParam: undefined,
		filterParam: undefined,
		url: PP.config.inv_api_path + 'change_queue'
	}
});


Ext.define('PP.ChangesGrid',{
	extend: 'PP.EntityEditorGrid',
	require: 'Ext.ux.RowExpander',
	mode: 'chooser',
	stateful:false,
    chooser_select:'multiple',
	chooser_buttonText:'Approve Change(s)',
	chooser_callbackdata:['id','entity_key','entity','change_content'],
	// columns:[],
	plugins: [{
        ptype: 'rowexpander',
        rowBodyTpl : [
		' {changes}'
        ]
    }],
	store: new Ext.data.Store({
		model:'changes',
		autoLoad:false
	}),
	chooser_callback:function(d){
		PP.log(d);
		Ext.getCmp('fieldchanges').setTitle('Record changes');
		Ext.each(d,function(i){
			PP.saveChangeRecord(i.entity,i.entity_key,i.change_content,i.id,function(){
				Ext.getCmp('changes').store.remove(Ext.getCmp('changes').store.getById(i.id));
			});
		});
	},
	entity:"change_queue",
	lexicon:PP.lexicon,
	//query:"*",
	
	// plugins: expander,
	columns:[
	    { header: "Time",hidden:false, width: 120, sortable: true,dataIndex:'change_time'},
	    { header: "Business",hidden:false, width: 60, sortable: true,dataIndex:'system_type'},
	    { header: "Entity",hidden:true, width: 80, sortable: true,dataIndex:'entity'},
	    { header: "Key", width: 140, sortable: true,dataIndex:'entity_key'},
	    { header: "Changes", flex:1,width: 200, sortable: true,dataIndex:'change_content',id:'change_content'},
	    { header: "IP Address",hidden:true, width: 100, sortable: true, dataIndex:'change_ip'},
	    { header: "User",hidden:true, width: 100, sortable: true, dataIndex:'change_user'},
	    { header: "ID",hidden:true, width: 40, sortable: true, dataIndex:'id'}
	 ],
	tbar:[
		'Changes for: ',
		{
			xtype:'combo',
			name: 'changetypes',
			value:'',
			emptyText:'choose...',
			store:['All','Archiving','Core','EDN','Eng','POD'],
			triggerAction:'all',
			width:100,
			listeners:{
				focus: function(f){
					f.onTriggerClick();
				},
				'select':function(f,v){
					if(v[0].data.field1=='All')
					{
						Ext.getCmp('changes').store.load({params:{entity_key:'*'}});
					}
					else
					{
						Ext.getCmp('changes').store.load({params:{system_type:v[0].data.field1}});
					}
				}
			}
		},
		{
			xtype:'button',
			iconCls:'add',
			text:'Approve Selected Changes',
			handler:function(d){
				Ext.each(this.up('panel').getSelectionModel().getSelection(),function(i){
					var timer=Math.floor(Math.random()*500);
					this.saveChangeRecord(i.data.entity,i.data.entity_key,i.data.change_content,i.id,function(){
					// this.saveChangeRecord.defer(timer,this,[i.data.entity_key,i.data.change_content,i.id,function
						i.destroy();
						this.store.remove(i);
					// }]);
					});
				},this.up('panel'));
			}
		},
		{
			xtype:'button',
			iconCls:'drop',
			text:'Drop Selected Changes',
			handler:function(d){
				Ext.each(this.up('panel').getSelectionModel().getSelection(),function(i){
					i.destroy();
					this.store.remove(i);
					return;
					var timer=Math.floor(Math.random()*500);
					Ext.Ajax.request.defer(timer,Ext.Ajax,[{
						url: PP.config.inv_api_path + 'change_queue/' + i.id,
						method: 'DELETE',
						success: function(r,o)
						{
							Ext.getCmp('changes').store.remove(i);
						}
					}]);
				});
			}
		}									
	],
	initComponent:function(){
		if(this.chooser_select == 'multiple')
		{
			this.multiSelect=true;
		}
		PP.ChangesGrid.superclass.initComponent.call(this);
		this.view.getRowBodyFeatureData=function(data, idx, record, orig) {
	        var o = Ext.grid.feature.RowBody.prototype.getAdditionalData.apply(this, arguments),
	            id = this.columnId;
	        o.rowBodyColspan = o.rowBodyColspan - 1;
	        o.rowBody = this.getRowBodyContents(data);
	        o.rowCls = this.recordsExpanded[record.internalId] ? '' : this.rowCollapsedCls;
	        o.rowBodyCls = this.recordsExpanded[record.internalId] ? '' : this.rowBodyHiddenCls;
	        o[id + '-tdAttr'] = ' valign="top" rowspan="2" ';
	        if (orig[id+'-tdAttr']) {
	            o[id+'-tdAttr'] += orig[id+'-tdAttr'];
	        }
	        return o;
	    };
		this.view.on('expandbody',function(rowNode, record){
			if(record.get('changes')=='loading...'){
				Ext.Ajax.request({
					url: PP.config.inv_api_path + 'system/' + record.data.entity_key,
					method: 'GET',
					record: record,
					row:rowNode,
					scope: this,
					async:false,
					success:function(r,o){
						var changes = Ext.decode(record.data.change_content);
						var recs=Ext.decode(r.responseText);
						var content='';
						content+='<div><i>User: ' + record.data.change_user + ' IP: ' + record.data.change_ip + '</i></div>';
						content+='<div style="padding-left:10px;">';
						for (var i in changes)
						{
							if(typeof changes[i] == 'function') continue;
							content+=' <b>' + PP.getFieldLabel(i,record.data.entity) + ':</b> ' + recs[i] + ' &rarr; ' + changes[i] + '<br>';
						}
						content+='</div>';
			            record.set('changes',content);	
						var rowContent=Ext.dom.Query.selectNode('tr:nth(2) td div',rowNode).innerHTML;
						Ext.dom.Query.selectNode('tr:nth(2) td div',rowNode).innerHTML=content;
					}
				});
	        
			}
		});
	},
	saveChangeRecord:function(entity,key,content,id,callback)
	{
		PP.log('commit change item');
		var url=PP.config.inv_api_path + entity + '/' + key;
		Ext.Ajax.request({
	        url: url,
	        method: 'PUT',
	        jsonData: Ext.decode(content),
			grid:this,
	        headers: {
	            'Content-Type': 'application/json'
	        },
	        failure: function(r) {
	            Ext.Msg.alert('Error', 'There was an error saving your data:<br> ' + r.responseText);
	        },
	        success: function(r, o) {
				// 
				// Ext.Ajax.request({
				// 	url: PP.config.inv_api_path+ 'change_queue/' + id,
				// 	grid:o.grid,
				// 	method: 'DELETE',
				// 	success: function(r,o)
				// 	{
						if(typeof callback=='function')
						{
							callback.call(o.grid);
						}
				// 	}
				// });


			}
		});	
	}

});