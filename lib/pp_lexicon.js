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

//Set of functions for dealing with the lexicon.  Lexicon should already be loaded into PP.lexicon.  this
// is done by this library at the end of the file

if(typeof PP == 'undefined')
{
	Ext.namespace('PP');
	PP.log = function(log) {
	    if (window.console) {
	        console.log(log);
	    }
	}	
}
PP.allowEditing=false;

// below items are for backward compatibility with otehr systems that may load pp_lexicon.js
PP.url=PP.config.inv_api_path+'system/';
PP.editors=new Object;
PP.user = {
    username: 'test',
    password: 'test'
};

PP.saveRecord=function(r){	
	r.save();
	r.commit();
}

// parses lexicon to return the key field for an entity
PP.getEntityKey=function(entity){
	if(Ext.DomQuery.selectNode(entity,PP.lexicon).getAttribute('extends') != null)
	{
		return Ext.DomQuery.selectNode(Ext.DomQuery.selectNode(entity,PP.lexicon).getAttribute('extends')).getAttribute('key');	
	}
	return Ext.DomQuery.selectNode(entity,PP.lexicon).getAttribute('key');
}


// parses lexicon for entity and returns array of field names for that entity
PP.getEntityFields=function(entity){
	var fieldlist=[];
	if(Ext.DomQuery.selectNode(entity,PP.lexicon).getAttribute('extends') != null)
	{
		PP.log('processing superclass');
		Ext.each(Ext.query(Ext.DomQuery.selectNode(entity,PP.lexicon).getAttribute('extends') +'/*',PP.lexicon),function(item){
 			if(item.nodeName=='#text' || item.nodeName=='#comment' )
			{
				return;
			}
			fieldlist.push(item.nodeName);
		});
	}
	Ext.each( Ext.query( entity + '>*', PP.lexicon),function(item){
		if(item.nodeName=='#text' || item.nodeName=='#comment' )
		{
			return;
		}
		fieldlist.push(item.nodeName);
	});
    return fieldlist;
}

// parses lexicon to find label attribute for field.  returns fieldname if no label is found
PP.getFieldLabel=function(field,entity){
	var labellkup;
	entity=entity || 'system';
	if(field=='' || field==undefined)
	{
		return '';
	}
	field=Ext.DomQuery.selectNode('device>'+field, PP.lexicon) || Ext.DomQuery.selectNode(entity + '>'+field, PP.lexicon)
	if(field && field.getAttribute('label'))
	{
		labellkup=field.getAttribute('label');
	}
	else
	{	
		if (Ext.DomQuery.selectNode('label', field))
	    {
	        labellkup = Ext.get(Ext.DomQuery.selectNode('label', field)).dom.firstChild.textContent;
	    }
	    else
	    {
			if(field)
			{
		        if (Ext.DomQuery.select(field.getAttribute('maps_to') + '/label', PP.lexicon).length > 0)
		        {
		            if (Ext.get(Ext.DomQuery.selectNode(field.getAttribute('maps_to') + '/label', PP.lexicon)).dom.firstChild)
		            {
		                labellkup = Ext.get(Ext.DomQuery.selectNode(field.getAttribute('maps_to') + '/label', PP.lexicon)).dom.firstChild.textContent;
		            }
		        }
			}
	    }
	}
	if(labellkup==undefined && field !=undefined)
	{
		return field.localName;
	}
	else
	{
		return labellkup;
	}
}

// returns text/combo/textarea editor config  based on whether lexicon defines an enumerator
PP.getEditorConfig = function(editor_name,opts) {
	
	if(!opts || !opts.entity)
	{
		PP.log('PP.getEditorConfig called without "opts"');
		return;
		// return 'textfield';
	}
	if(typeof opts.labels == 'undefined')
	{
		opts.labels=true;
	}
	if(!PP.editors)
	{
		PP.editors={};
	}
    if (PP.editors[editor_name] && false)
    {
        //PP.log('editor already built');
    }
    else
    {
        var nodePath = opts.entity + '>' + editor_name;
		if(!Ext.DomQuery.selectNode(nodePath,PP.lexicon)  && Ext.DomQuery.selectNode(opts.entity,PP.lexicon).getAttribute('extends'))
		{
			nodePath= Ext.DomQuery.selectNode(opts.entity,PP.lexicon).getAttribute('extends') + '/' + editor_name;
		}
		if(Ext.DomQuery.selectNode(nodePath,PP.lexicon) && Ext.DomQuery.selectNode(nodePath,PP.lexicon).getAttribute('maps_to'))
		{
			nodePath=Ext.DomQuery.selectNode(nodePath,PP.lexicon).getAttribute('maps_to');
		}
        //PP.log('check lexicon for ' + sel);
		if(!Ext.ModelManager.getModel('enumerator'))
		{
			Ext.define('enumerator',{
				extend: 'Ext.data.Model',
                fields: [{
                    name: 'value',
                    mapping: '/'
                }]
			});
		}
		if(!Ext.ModelManager.getModel('arraymenu'))
		{
			Ext.define('arraymenu',{
				extend: 'Ext.data.Model',
                fields: [{
                    name: 'value',
                    mapping: '0'
                }]
			});
		}
		if(!Ext.ModelManager.getModel('roles'))
		{
			Ext.define('roles',{
				extend: 'Ext.data.Model',
				fields: ['role_id','role_name']
			});
		}
		if (Ext.DomQuery.selectNode(nodePath + '> enumeration', PP.lexicon))
        {
            return {//new Ext.form.ComboBox({
				xtype:'combo',
                name: editor_name,
                //id: editor_name,
				fieldLabel:( opts.labels ? PP.getFieldLabel(editor_name) : undefined),
                displayField: 'value',
				store: (Ext.StoreManager.get(editor_name + '_store')) ? Ext.StoreManager.get(editor_name + '_store'): new Ext.data.Store({
					model: 'enumerator',
					storeId: editor_name + '_store',
                    proxy: {
						type: 'memory',
						data: Ext.DomQuery.selectNode(nodePath,PP.lexicon),
						reader:{
							type: 'xml',
	                        // idProperty: '/',
							// root: Ext.DomQuery.selectNode(editor_name + '> enumeration',PP.lexicon),
							root: 'enumeration',
	                        record: 'enumerator'
	                    }   
					},
                    autoLoad: true
                }),
               	listeners: {
					focus: function(f){
						f.onTriggerClick();
					}
				},
			 	queryMode: 'local',
				typeAhead: true,
                editable: true,
                selectOnFocus: true,
                triggerAction: 'all'
            }; //);
            PP.log('made enumarated combo for ' + editor_name);

        }
        else
        {
            if (editor_name == 'config_agent_output' || editor_name == 'notes' || editor_name == 'warranty_info' || editor_name == 'tags')
            {
                return { //new Ext.form.TextArea({
					xtype:'textarea',
					fieldLabel:( opts.labels ? PP.getFieldLabel(editor_name) : undefined),
					name:editor_name,
                    selectOnFocus: true
                }; //);

            }
            else if (editor_name == 'roles' || editor_name == 'manufacturer' || editor_name == 'svc_id' || editor_name == 'environment_name' || editor_name == 'product_name' || editor_name == 'operating_system')
            {
                return  { //new Ext.form.ComboBox({
					xtype:'combo',
                    name: editor_name,
					fieldLabel:( opts.labels ? PP.getFieldLabel(editor_name) : undefined),
                    //id: editor_name,
					name:editor_name,
					forceSelection:  (
	 								editor_name == 'svc_id' || editor_name == 'environment_name' || editor_name == 'roles' ?
									true	:  false
								),
                    displayField: (
	 								editor_name == 'svc_id' || editor_name == 'environment_name' ?
									'name'	: (editor_name == 'roles' ? 'role_id' : 'value')
								),
					multiSelect: ( editor_name == 'roles' ? true : false),
                    store: new Ext.data.Store({
                    // (Ext.StoreManager.get(editor_name + '_store')) ? Ext.StoreManager.get(editor_name + '_store'): new Ext.data.Store({
						// storeId: editor_name + '_store',
						model: ( editor_name == 'svc_id' || editor_name == 'environment_name' ? 'service_instance' : ( editor_name == 'roles' ? 'roles' : 'arraymenu')),
						reader: {
							type:  ( editor_name == 'roles' || editor_name == 'svc_id' || editor_name == 'environment_name' ? 'json' : 'array')
						},
                        sorters:[
                            {
                                property: editor_name == 'svc_id' || editor_name == 'environment_name' ? 'name'  : (editor_name == 'roles' ? 'role_id' : 'value'),
                                direction: 'ASC'
                            }
                        ],
                        autoLoad: true,
						proxy: {
							type: 'ajax',
							startParam: undefined,
							pageParam: undefined,
							limitParam: undefined,
							sortParam: undefined,
                            filterParam: undefined,
                            url: (
									editor_name == 'environment_name' ?
										PP.config.inv_api_path + 'service_instance/?type=environment'
									 : (
										editor_name == 'svc_id' ? 
										 PP.config.inv_api_path + 'service_instance/?type!=environment'
										: ( editor_name =='roles'? PP.config.inv_api_path + 'role/' : PP.config.inv_api_path + 'column_lkup/' + opts.entity + '/' + editor_name)
									  )
								 ),
                            method: 'GET'
                        },
                    }),
					listeners: {
						focus: function(f){
							f.onTriggerClick();
						}
					},
                    queryMode: 'local',
                    editable: true,
                    selectOnFocus: true,
                    triggerAction: 'all',
					listConfig: ( editor_name =='roles' ? {
						getInnerTpl:  function() {
							var tm=  '<tpl for=".">'
								+'<div class="x-combo-list-item">'
							+'<div class="ux-lovcombo-item-text">{role_id}</div>'
							+'<div class="ux-lovcombo-item-smalltext">{role_name}</div>'
							+'</div>'
							+'</tpl>';
							return tm;
						}
					} : undefined )
                }; //);
                PP.log('made distinct combo for ' + editor_name);

            }
            {
               return { //new Ext.form.TextField({
					xtype:'textfield',
					fieldLabel:( opts.labels ? PP.getFieldLabel(editor_name) : undefined),
					name:editor_name,
                    selectOnFocus: true
                }; //);
            }
        }
    }
    //PP.log(PP.editors[editor_name]);
    return PP.editors[editor_name];
}



// parses lexicon and sets up models for each entity
PP.lexicon_load = function(config) {

	var entities={};
	
	Ext.each(Ext.query('entities>*',PP.lexicon),function(ent){
		if(ent.nodeName=='#text' || ent.nodeName=='#comment' )
		{
			return;
		}
		var entry={
			name: ent.nodeName
		};
		var fields=[];
		Ext.each(Ext.query('entities>' + entry.name + '>*',PP.lexicon),function(f){
 			if(f.nodeName=='#text' || f.nodeName=='#comment' )
			{
				return;
			}
			if(f.nodeName=='roles')
			{
				fields.push({
					name: f.nodeName,
					convert: function(v){
						if(v && typeof v == 'string')
						{
							return v.replace(/\ /g,'').split(',');							
						}
						else
						{
							return v;
						}
					}
				});
				return;
			}
			fields.push({
				name: f.nodeName,
//TODO need to add better type handling/detection to support validaters and formartters
				type: ( (f.getAttribute('maps_to') && f.getAttribute('maps_to').match('date')) ? 'date' : undefined  )
			});
			
		});
		if(ent.getAttribute('extends'))
		{
			Ext.each(Ext.query(ent.getAttribute('extends') +'/*',PP.lexicon),function(f){
				if(f.nodeName=='#text' || f.nodeName=='#comment' )
				{
					return;
				}
				fields.push({
					name: f.nodeName,
					type: ( (f.getAttribute('maps_to') &&  f.getAttribute('maps_to').match('date') ) ? 'date' : undefined  )
				});

			});
		}
		entry.fields=fields;
		entry.extend='Ext.data.Model';
		entry.idProperty=ent.getAttribute('key');
		entry.validations= [
			{
				field: entry.idProperty,
				type: 'length',
				min: 1
			}
		];
		entry.proxy={
			type: 'rest',
			startParam: undefined,
			pageParam: undefined,
			limitParam: undefined,
			sortParam: undefined,
            filterParam: undefined,
			url: PP.config.inv_api_path + entry.name,
			reader: {
				type: 'json',
				messageProperty: 'message'
			}
		};
		if(entry.name=='system')
		{
			entry.fields.push('changes');
		}
		Ext.define(entry.name,entry);
		//entities.push(entry);
	});
	PP.log('lexicon loaded');
}


// Load the lexicon syncronously, then parse it to setup the models for the entities

var url = PP.config.lexicon_path;
//var url = '/pp_lexicon.xml',
fileName = url.split('/').pop(),
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
    
    PP.lexicon=xhr.responseXML;
	PP.lexicon_load();

}
else {
    onError.call(this, "Failed loading synchronously via XHR: '" + url + "'; please " +
                       "verify that the file exists. " +
                       "XHR status code: " + status);
}


// Load the user info syncronously

var url=PP.config.inv_api_path + 'currentUser/' + PP.currentUser,
fileName = url.split('/').pop(),
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
    
	var lkup=Ext.decode(xhr.responseText);
	if(typeof(lkup)!=null && typeof(lkup['writeaccess'])!='undefined' && (lkup.writeaccess == 'true' || lkup.writeaccess == true || lkup.writeaccess==1)) 
	{
		PP.allowEditing=true;
	}
	if(!PP.currentUser || lkup.username!=null)
	{
		PP.currentUser=lkup.username;
		PP.user=lkup;
	}
}
else {
    onError.call(this, "Failed loading user info via XHR: '" + url + "'; " +
                       "XHR status code: " + status);
}


