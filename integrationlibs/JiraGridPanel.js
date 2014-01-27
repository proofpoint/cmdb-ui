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


if (!Ext.ModelManager.getModel('jira_issue')) {

    if (PP.config.jiraRESTbridge) {
        Ext.define('jira_issue', {
            extend: 'Ext.data.Model',
            idProperty: 'key',
            fields: [{
                name: 'title',
                mapping: 'fields.summary'
            }, {
                name: 'link',
                mapping: 'self'
            }, {
                name: 'project',
                mapping: 'fields.project.key'
            }, {
                name: 'key',
                mapping: 'key'
            }, {
                name: 'summary',
                mapping: 'fields.summary'
            }, {
                name: 'type',
                mapping: 'fields.issuetype.name'
            }, {
                name: 'priority',
                mapping: 'fields.priority.name'
            }, {
                name: 'status',
                mapping: 'fields.status.name'
            }, {
                name: 'resolution',
                mapping: 'fields.resolution.name'
            }, {
                name: 'assignee',
                mapping: 'fields.assignee.name'
            }, {
                name: 'reporter',
                mapping: 'fields.reporter.name'
            }, {
                name: 'created',
                mapping: 'fields.created'
            }, {
                name: 'updated',
                mapping: 'fields.updated'
            }, {
                name: 'component',
                mapping: 'fields.components'
            }],
            proxy: {
                type: 'rest',
                reader: {
                    type: 'json',
                    root: 'issues'
                },
                noCache: false,
                startParam: undefined,
                pageParam: undefined,
                limitParam: undefined,
                filterParam: undefined,
                url: PP.config.jira_path + 'search'
            }
        });
    } else {
        Ext.define('jira_issue', {
            extend: 'Ext.data.Model',
            idProperty: 'key',
            fields: ['title', 'link', 'project', 'key', 'summary',
                'type', 'priority', 'status', 'resolution', 'assignee',
                'reporter', 'created', 'updated', 'component'
            ],
            proxy: {
                type: 'rest',
                noCache: false,
                startParam: undefined,
                pageParam: undefined,
                limitParam: undefined,
                filterParam: undefined,
                url: PP.config.jira_path + 'issue/'
            }
        });
    }
}


Ext.define('PP.JiraGridPanel', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.jiragridpanel',
    system: '',
    jql: '',
    username: 'nagios',
    password: 'nagios',
    // url: '/jira_api/v1/issue/',
    loadMask: true,
    columns: [{
        text: 'ID',
        width: 75,
        dataIndex: 'key',
        sortable: true,
        id: 'key',
        renderer: jiraLinkRender
    }, {
        text: 'Status',
        width: 80,
        dataIndex: 'status',
        sortable: true,
        id: 'status',
        renderer: jiraStatusRender
    }, {
        text: 'Title',
        width: 300,
        dataIndex: 'summary',
        sortable: true,
        id: 'summary'
    }],
    load: function(system) {
        if (!system) {
            return;
        }
        if (system) this.system = system;
        // strip domain name from hosts
        var hostname = this.system.split('.');
        this.system = hostname[0];
        if (this.system.length < 5) {
            return;
        }
        this.jql = 'summary ~ "' + this.system + '" OR description ~ "' + this.system + '" OR comment ~ "' + this.system + '"';
        //this.store.load();
        this.store.load({
            params: {
                jql: this.jql
            }
        });
        PP.log('JiraGridPanel load: ' + this.system);
    },
    initComponent: function() {
        this.store = new Ext.data.Store({
            model: 'jira_issue',
            // reader: {
            // 	root: '',
            // 	id: 'key',
            // 	fields: ['title','link','project','key','summary','type','priority','status','resolution','assignee','reporter','created','updated','component']
            // },
            baseParams: {
                tempMax: 1000,
                os_username: this.username,
                os_password: this.password
            },
            autoLoad: false
        });

        PP.JiraGridPanel.superclass.initComponent.call(this);
        if (this.system) {
            this.load(this.system);
        }
    }
});


function jiraLinkRender(value, o, r, row, col, store) {
    return "<a target=_blank href='https://" + PP.config.jira_host + "/browse/" + r.get('key') + "'>" + value + "</a>";
}

function jiraStatusRender(value) {
    if (value == 1) return 'New';
    if (value == 3) return 'In Progress';
    if (value == 5) return 'Resolved';
    if (value == 6) return 'Closed';
    if (value == 8) return 'Verified';
    return value;
}