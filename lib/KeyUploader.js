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

Ext.require([
    'Ext.form.*',
    'Ext.layout.container.Column',
    'Ext.tab.Panel'
]);

if (typeof PP == 'undefined') {
    Ext.namespace('PP');
    PP.log = function(log) {
        if (window.console) {
            console.log(log);
        }
    }
    PP.notify = function() {
        var msgCt;

        function createBox(t, s) {
            return '<div class="msg"><h3>' + t + '</h3><p>' + s + '</p></div>';
        }

        return {
            msg : function(title, format) {
                if (!msgCt) {
                    msgCt = Ext.core.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
                }
                var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
                var m = Ext.core.DomHelper.append(msgCt, createBox(title, s), true);
                m.hide();
                m.slideIn('t').ghost("t", { delay: 1000, remove: true});
            },

            init : function() {
            }
        };
    }();
}

Ext.define('PP.KeyUploader', {
    extend: 'Ext.form.Panel',
    bodyStyle:'padding:5px 5px 0',
    //id: 'key_uploader_id',
    width: 600,
    fieldDefaults: {
        labelAlign: 'top',
        msgTarget: 'side'
    },

    items: [
        {
            xtype: 'container',
            anchor: '100%',
            layout:'column',
            items:[
                {
                    xtype: 'container',
                    columnWidth:.5,
                    layout: 'anchor',
                    items: [
                        {
                            xtype:'hidden',
                            fieldLabel: 'Username',
                            name: 'username',
                            anchor:'96%'
                        },
                        {
                            xtype:'hidden',
                            fieldLabel: 'Write Access',
                            name: 'writeaccess',
                            anchor:'96%'
                        }
                    ]
                },
                {
                    xtype: 'container',
                    columnWidth:.5,
                    layout: 'anchor',
                    items: [
                        {
                            xtype:'hidden',
                            fieldLabel: 'System User',
                            name: 'systemuser',
                            anchor:'100%'
                        },
                        {
                            xtype:'hidden',
                            fieldLabel: 'Groups',
                            name: 'groups',
                            anchor:'100%'
                        }
                    ]
                }
            ]
        },
        {
            xtype: 'filefield',
            width: 400,
            emptyText: 'Select file to upload...',
            fieldLabel: 'SSH Key File',
            name: 'sshkey-file',
            buttonText: '',
            buttonConfig: {
                icon: 'images/up2.gif'
            },
            listeners: {
                render: function() {
                    var inputTag = document.getElementsByName('sshkey-file')[0];
                    inputTag.addEventListener('change', function(event) {
                        var f = event.target.files[0];
                        if (f) {
                            var r = new FileReader();
                            r.onload = function(e) {
                                var contents = e.target.result;
                                Ext.getCmp('sshkey-text').setValue(Ext.util.Format.trim(contents));
                            }
                            r.readAsText(f);
                        }
                    }, true);
                }
            }

        },
        {
            xtype: 'textarea',
	    name: 'sshkey',
            id: 'sshkey-text',
            width: 400,
            height: 150
        }
    ],

    buttons: [
        {
            text: 'Save',
            handler: function() {
		var p=Ext.ModelManager.create(this.up('form').getForm().getValues(),'user');
		p.phantom=this.up('form').phantom;
		p.save({
			success: function(){
				PP.notify.msg('Success', 'Record saved');
				PP.user=p.data;
                		this.up('window').close();
			},
			failure:function(recs,op,success){
				if(!op.success)
				{
					Ext.Msg.alert("Error",'Server returned ' + op.error.status + ": " + op.error.statusText);
				}
			},
			scope: this
		});
//                var sshkeyText = Ext.getCmp('sshkey-text');
//                Ext.Ajax.request({
//                    url:'/inv_api/v1/user/' + PP.user.username,
//                    method:'PUT',
//                   jsonData: Ext.decode("{sshkey:'" + sshkeyText.value + "'}"),
//                    success: function() {
//                        Ext.Msg.alert("<br>Your ssh key has been saved successfully");
//                    },
//                    failure: function(r) {
//                        Ext.Msg.alert('Error', 'There was an error saving your data:<br> ' + r.responseText);
//                    }
//                });
            }
        },
        {
            text: 'Cancel',
            handler: function() {
                this.up('window').close();
            }
        }
    ],
    initComponent: function(){
	PP.KeyUploader.superclass.initComponent.call(this);
	var userrec={
		username: PP.user.username,
		writeaccess: (PP.user.writeaccess ? PP.user.writeaccess : 1),
		systemuser: 0,
		sshkey: (PP.user.sshkey ? PP.user.sshkey : ''),
		groups: (PP.user.groups ? PP.user.groups : 'Users')
	};
	this.phantom=(PP.user.groups ? false : true);
        var p=Ext.ModelManager.create(userrec,'user');
	this.getForm().loadRecord(p);
    }
});
