

2012.01.16 IF - change environment to environment_name
alter table service_instance change environment environment_name varchar(100);

2012.12.27 IF - add unique constraint to prevent duplicate service records in an environment. it causes problems
alter table service_instance add unique index(name,environment_name);
	TODO-UPDATE PUPPET SQL Schema