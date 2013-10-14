// The links in this structure are added to the left hand pane with each key adding children
// to the node of the same ID

PP.quicklinks={
    premade_queries:[
        {leaf:true,qtype:'query',text:'Systems in DC1',query:['data_center_code=DC1']},
        {leaf:true,qtype:'query',text:'Cloud Instances',query:['ip_address=*','cloud~.+','status!=decommissioned']}
    ],
    reports: [{ leaf: true, qtype:'js',text:'Summarize by Environment', js: 'PP.loadReport("environment_name");'},
        {leaf: true, qtype:'js',text:'Summarize by Creator', js: 'PP.loadReport("created_by");'}
        ],
    other_links: [
        {leaf:true,qtype:'js',text:'Graphite',js:'window.location="/graphite/index.html";'},
        {leaf:true,qtype:'js',text:'Nagios Monitoring',js:'window.location="/nagui/index.html";'},
        {leaf:true,qtype:'js',text:'LogStash',js:'window.location="/logstash/";'},
        {leaf:true,qtype:'js',text:'Jira',js:'window.location="/jira/";'},
        {leaf:true,qtype:'js',text:'SSH Key Uploader',js:'var w=new Ext.Window({title:"SSH Key",height:300,width:600,layout:"fit",items:[new PP.KeyUploader({region:"center",entity:"user"})]});w.show();'}
    ]
};