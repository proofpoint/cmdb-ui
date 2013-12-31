// Copyright 2013-2014 Evernote, Inc.
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

Ext.define('Ext.ux.panel.Rack', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.rack',
    elevation_start: 'bottom',
    elevation_max: 42,
    elevation_beginning: 1,
    position_key: 'position',
    ru_size_key: undefined,
    tip_key: 'tip',
    datadisplay: ['<div class="udata">',
        '{fqdn}',
        '</div>'
    ],
    racktablespec: {
        id: 'racktable',
        tag: 'table',
        cellpadding: 0,
        cellspacing: 0,
        cls: 'racktable',
        children: [],
    },
    loadRecords: function(recs, highlight) {
        if (highlight) {
            this.highlight = highlight;
        }
        this.positions = new Array(this.elevation_max);
        for (var r = 0; r < recs.length; r++) {
            if (recs[r].get(this.position_key)) {
                // add + 0 to type to number, just in case
                this.positions[recs[r].get(this.position_key) * 1] = recs[r];
            }
        }
    },
    makeHtmlSpec: function() {
        this.racktablespec.id = this.getId() + this.racktablespec.id;
        for (var i = this.elevation_beginning; i < (this.elevation_max + 1); i++) {
            var tplate = new Ext.Template(this.datadisplay);
            if (this.elevation_start == 'bottom') {
                u = Math.abs(i - (this.elevation_max + this.elevation_beginning));
            } else {
                u = i;
            }
            this.racktablespec.children.push({
                id: this.getId() + '-row' + u,
                tag: 'tr',
                cls: (i == this.elevation_max ? 'last' : undefined),
                children: [{
                    tag: 'td',
                    cls: 'ulabel',
                    html: '' + u
                }, {
                    id: this.getId() + '-row' + u + '-data',
                    cls: 'udata' + ((this.ru_size_key && this.positions[u] && this.positions[u].get(this.ru_size_key)) ? ' ru' + this.positions[u].get(this.ru_size_key) : ''),
                    tag: 'td',
                    tip: (this.positions[u] ? this.positions[u].get(this.tip_key) : undefined),
                    html: (this.positions[u] ? tplate.apply(this.positions[u].getData()) : '')
                }]
            });
            var current_pos = this.racktablespec.children.length - 1;
            if (this.highlight && this.highlight == u) {
                this.racktablespec.children[current_pos].children[1].cls += ' rowhighlight';
            }
            if (this.ru_size_key && this.positions[u] && this.positions[u].get(this.ru_size_key) && (this.positions[u].get(this.ru_size_key) * 1) > 1) {
                var ru_adjustment = this.positions[u].get(this.ru_size_key) - 1;
                this.racktablespec.children[current_pos - ru_adjustment].children[1] = this.racktablespec.children[current_pos].children[1];
                this.racktablespec.children[current_pos - ru_adjustment].children[1].rowspan = this.positions[u].get(this.ru_size_key);
                this.racktablespec.children[current_pos - ru_adjustment].children[1].cls += ' udataspan';
                for (var pp = current_pos; pp > (current_pos - ru_adjustment); pp--) {
                    this.racktablespec.children[pp].children.splice(1, 1);
                }
            }
        }
    },
    afterRender: function() {
        this.callParent();
        this.makeHtmlSpec();
        this.update(Ext.DomHelper.createHtml(this.racktablespec));
        for (var i = this.elevation_beginning; i < (this.elevation_max + 1); i++) {
            var u = undefined;
            if (this.elevation_start == 'bottom') {
                u = Math.abs(i - (this.elevation_max + this.elevation_beginning));
            } else {
                u = i;
            }
            if (this.positions[u] && this.positions[u].get(this.tip_key)) {
                Ext.tip.QuickTipManager.register({
                    target: this.getId() + '-row' + u + '-data',
                    text: this.positions[u].get(this.tip_key)
                });
            }
        }
    }
});