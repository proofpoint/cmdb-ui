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

Ext.define('Ext.ux.panel.Rack',
{
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
    racktablespec:
    {
        id: 'racktable',
        tag: 'table',
        cellpadding: 0,
        cellspacing: 0,
        cls: 'racktable',
        children: [],
    },
    loadRecords: function(recs, highlight)
    {
        if (highlight)
        {
            this.highlight = highlight;
        }
        this.positions = new Array(this.elevation_max);
        for (var r = 0; r < recs.length; r++)
        {
            if (recs[r].get(this.position_key))
            {
                // * 1 to type to number, just in case
                var ru_position = recs[r].get(this.position_key) * 1;
                // if the size of the system in this RU is > 1 then put it's ru posution at it's top
                // needed since table is assembled from the top
                if (recs[r].get(this.ru_size_key) && (recs[r].get(this.ru_size_key) * 1) > 1)
                {
                    ru_position = ru_position + recs[r].get(this.ru_size_key) - 1;
                    // adjust highlight also if the highlight RU is > 1
                    if (this.highlight == recs[r].get(this.position_key) * 1)
                    {
                        this.highlight = ru_position;
                    }
                }
                this.positions[ru_position] = recs[r];
            }
        }
    },
    makeHtmlSpec: function()
    {
        this.racktablespec.id = this.getId() + this.racktablespec.id;
        var rowspan = 1;
        // loop through ru and assemble the table
        for (var i = this.elevation_beginning; i < (this.elevation_max + 1); i++)
        {
            var tplate = new Ext.Template(this.datadisplay);
            if (this.elevation_start == 'bottom')
            {
                u = Math.abs(i - (this.elevation_max + this.elevation_beginning));
            }
            else
            {
                u = i;
            }
            // only add the 'data' cell if we are not following a multi-RU system row above (rowspan)
            if (rowspan > 1)
            {
                this.racktablespec.children.push(
                {
                    id: this.getId() + '-row' + u,
                    tag: 'tr',
                    cls: (i == this.elevation_max ? 'last' : undefined),
                    children: [
                    {
                        tag: 'td',
                        cls: 'ulabel',
                        html: '' + u
                    }]
                });
                rowspan--;
            }
            else
            {
                this.racktablespec.children.push(
                {
                    id: this.getId() + '-row' + u,
                    tag: 'tr',
                    cls: (i == this.elevation_max ? 'last' : ''),
                    children: [
                    {
                        tag: 'td',
                        cls: 'ulabel',
                        html: '' + u
                    },
                    {
                        id: this.getId() + '-row' + u + '-data',
                        // assemble class = data + ru label class for differentiation  + highlight? 
                        cls: 'udata' + ((this.ru_size_key && this.positions[u] && this.positions[u].get(this.ru_size_key)) ? ' ru' + this.positions[u].get(this.ru_size_key) : '') + (this.highlight == u ? ' rowhighlight' : ''),
                        tag: 'td',
                        tip: (this.positions[u] ? this.positions[u].get(this.tip_key) : undefined),
                        html: (this.positions[u] ? tplate.apply(this.positions[u].getData()) : '')
                    }]
                });
            }

            var current_pos = this.racktablespec.children.length - 1;
            // check to see if entry spans multiple ru then do some rowspan stuff
            if (this.ru_size_key && this.positions[u] && this.positions[u].get(this.ru_size_key) && (this.positions[u].get(this.ru_size_key) * 1) > 1)
            {
                if (this.racktablespec.children[current_pos] == undefined)
                {
                    debugger;
                }
                // adjust the rowspan to the size of the box ( in ru )
                rowspan = this.positions[u].get(this.ru_size_key);
                this.racktablespec.children[current_pos].children[1].rowspan = rowspan;
                this.racktablespec.children[current_pos].children[1].cls += ' udataspan';
                // i + (this.positions[u].get(this.ru_size_key) * 1) - 1;
            }
        }
    },
    afterRender: function()
    {
        this.callParent();
        this.makeHtmlSpec();
        this.update(Ext.DomHelper.createHtml(this.racktablespec));
        for (var i = this.elevation_beginning; i < (this.elevation_max + 1); i++)
        {
            var u = undefined;
            if (this.elevation_start == 'bottom')
            {
                u = Math.abs(i - (this.elevation_max + this.elevation_beginning));
            }
            else
            {
                u = i;
            }
            if (this.positions[u] && this.positions[u].get(this.tip_key))
            {
                Ext.tip.QuickTipManager.register(
                {
                    target: this.getId() + '-row' + u + '-data',
                    text: this.positions[u].get(this.tip_key)
                });
            }
        }
    }
});