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

// Ext.override(Ext.LoadMask, {
//       onHide: function() { this.callParent(); }
// });
// Ext.override(Ext.grid.RowEditor,{
// 	initComponent: function() {
//         var me = this,
//             form;
// 
//         me.cls = Ext.baseCSSPrefix + 'grid-row-editor';
// 
//         me.layout = {
//             type: 'hbox',
//             align: 'middle'
//         };
// 
//         
//         
//         me.columns = Ext.create('Ext.util.HashMap');
//         me.columns.getKey = function(columnHeader) {
//             var f;
//             if (columnHeader.getEditor) {
//                 f = columnHeader.getEditor();
//                 if (f) {
//                     return f.id;
//                 }
//             }
//             return columnHeader.id;
//         };
//         me.mon(me.columns, {
//             add: me.onFieldAdd,
//             remove: me.onFieldRemove,
//             replace: me.onFieldReplace,
//             scope: me
//         });
// 
//         me.callParent(arguments);
// 
//         if (me.fields) {
//             me.setField(me.fields);
//             delete me.fields;
//         }
// 		this.columns.each(function(id, column) {
// 	        if (column.isHidden()) {
// 	                column.getEditor().hide();
// 	        }
//         });
//         form = me.getForm();
//         form.trackResetOnLoad = true;
//     }
// });
// 

Ext.override(Ext.data.Model,{
    changeId: function(oldId, newId) {
        var me = this,
            hasOldId, hasId, oldInternalId;
            
        if (!me.preventInternalUpdate) { 
            hasOldId = me.hasId(oldId);
            hasId = me.hasId(newId);
            oldInternalId = me.internalId;
            // me.phantom  = !hasId;
            // The internal id changes if:
            // a) We had an id before and now we don't
            // b) We didn't have an id before and now we do
            // c) We had an id and we're setting a new id
            if (hasId !== hasOldId || (hasId && hasOldId)) {
                me.internalId = hasId ? newId : Ext.data.Model.id(me);
            }
        
            me.fireEvent('idchanged', me, oldId, newId, oldInternalId);
            me.callStore('onIdChanged', oldId, newId, oldInternalId);
         }
    }
});

Ext.override(Ext.data.proxy.Rest,{
	buildUrl: function(request) {
        var me        = this,
            operation = request.operation,
            records   = operation.records || [],
            record    = records[0],
            format    = me.format,
            url       = me.getUrl(request),
            id        = record ? (record.isModified(record.idProperty) ? record.modified[record.idProperty] : record.getId()) : operation.id;
        
        if (me.appendId && id) {
            if (!url.match(/\/$/)) {
                url += '/';
            }
            
            url += id;
        }
        
        if (format) {
            if (!url.match(/\.$/)) {
                url += '.';
            }
            
            url += format;
        }
        
        request.url = url;
        
        return me.callParent(arguments);
    }
});
// Ext.override(Ext.data.reader.Reader,{
// 	read: function(response) {
//         var data = response;
// 
//         if (response && response.responseText) {
//             data = this.getResponseData(response);
//         }
// 		
//         if (data && response.responseText!='') {
//             return this.readRecords(data);
//         } else {
// 			return Ext.create('Ext.data.ResultSet', {
// 	            total  : 0,
// 	            count  : 0,
// 	            records: response.request.options.records,
// 	            success: true
// 	        });
//             return this.nullResultSet;
//         }
//     }    
// });
// 
// 
Ext.override(Ext.data.proxy.Server,{
    processResponse: function(success, operation, request, response, callback, scope){
        var me = this,
            reader,
            result;

        if (success === true) {
            reader = me.getReader();

            // Apply defaults to incoming data only for read operations.
            // For create and update, there will already be a client-side record
            // to match with which will contain any defaulted in values.
            reader.applyDefaults = operation.action === 'read';

            result = reader.read(me.extractResponseData(response));

            if (result.success !== false) {
                //see comment in buildRequest for why we include the response object here
                Ext.apply(operation, {
                    response: response,
                    resultSet: result
                });

                operation.commitRecords(result.records);
                operation.setCompleted();
                operation.setSuccessful();
            } else {
                Ext.apply(operation, {
                    response: response
                });
                operation.setException(result.message);
                me.fireEvent('exception', this, response, operation);
            }
        } else {
            Ext.apply(operation, {
                response: response
            });
            me.setException(operation, response);
            me.fireEvent('exception', this, response, operation);
        }

        //this callback is the one that was passed to the 'read' or 'write' function above
        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }

        me.afterRequest(request, success);
    }
});
// // 	processResponse: function(success, operation, request, response, callback, scope){
// // 	    var me = this,
// // 	        reader,
// // 	        result,
// // 	        records,
// // 	        length,
// // 	        mc,
// // 	        record,
// // 	        i;
// //         
// // 	    if (success === true) {
// // 	        reader = me.getReader();
// // 	        result = reader.read(me.extractResponseData(response));
// // 	
// // // Following line change to handle empty response (204)	
// // 	        records = (response.status == 204 ? [] : result.records) || [];
// //             // records = result.records;
// // 	        length = records.length;
// //         
// // 	        if (result.success !== false) {
// // 	            mc = Ext.create('Ext.util.MixedCollection', true, function(r) {return r.getId();});
// // 	            mc.addAll(operation.records);
// // 	            for (i = 0; i < length; i++) {
// // 	                record = mc.get(records[i].getId());
// //                 
// // 	                if (record) {
// // 	                    record.beginEdit();
// // 	                    record.set(record.data);
// // 	                    record.endEdit(true);
// // 	                }
// // 	            }
// //             
// // 	            //see comment in buildRequest for why we include the response object here
// // 	            Ext.apply(operation, {
// // 	                response: response,
// // 	                resultSet: result
// // 	            });
// //             
// // 	            operation.setCompleted();
// // 	            operation.setSuccessful();
// // 	        } else {
// // 	            operation.setException(result.message);
// // 	            me.fireEvent('exception', this, response, operation);
// // 	        }
// // 	    } else {
// // 	        me.setException(operation, response);
// // 	        me.fireEvent('exception', this, response, operation);              
// // 	    }
// //         
// // 	    //this callback is the one that was passed to the 'read' or 'write' function above
// // 	    if (typeof callback == 'function') {
// // 	        callback.call(scope || me, operation);
// // 	    }
// //         
// // 	    me.afterRequest(request, success);
// // 	}
// });
// Ext.override(Ext.data.Store,{
// 	loadRecords: function(records, options) {
//         var me     = this,
//             i      = 0,
//             length = (records ? records.length : 0);
// 
//         options = options || {};
// 
// 
//         if (!options.addRecords) {
//             delete me.snapshot;
//             me.data.clear();
//         }
// 
//         me.data.addAll(records);
// 
//         //FIXME: this is not a good solution. Ed Spencer is totally responsible for this and should be forced to fix it immediately.
//         for (; i < length; i++) {
//             if (options.start !== undefined) {
//                 records[i].index = options.start + i;
// 
//             }
//             records[i].join(me);
//         }
// 
//         /*
//          * this rather inelegant suspension and resumption of events is required because both the filter and sort functions
//          * fire an additional datachanged event, which is not wanted. Ideally we would do this a different way. The first
//          * datachanged event is fired by the call to this.add, above.
//          */
//         me.suspendEvents();
// 
//         if (me.filterOnLoad && !me.remoteFilter) {
//             me.filter();
//         }
// 
//         if (me.sortOnLoad && !me.remoteSort) {
//             me.sort();
//         }
// 
//         me.resumeEvents();
//         me.fireEvent('datachanged', me, records);
//     }  
// });
