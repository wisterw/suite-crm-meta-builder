## Context
We are a small systems integrator with an opportunity to deploy CRM systems for case managers who review SNAP benefits applications.  All 50 states have slightly different rules for administering their benefits and we want to leverage common learning and technology across all of them.  Our vision is that we will track the necessary metadata in a single central dictionary and support the concept of overrides or custom / extra fields that apply to a single state or multile states.
## Objective
For now, we are using SuiteCRM as the technology infrastructure.  Write a small utility that generates PHP and SQL scripts to create the new fields and/or modify existing fields inside SuiteCRM for a specific deployment (indicated by a state code).
## Requirements
Write a utility in Node called UpsertCustomFields.  UpsertCustomFields will take 3 arguments:
1. argument 1 is a 2-letter state code which will filter the input metadata file.
2. argument 2 is a path to a CSV input file which contains the metadata.  We will read from this file to generate suitecrm configuration commands.  This file is in CSV format.  The first row is a header row.
3. argument 3 is the path to a directory that contains the existing configuration scripts.  There is one script for the PHP (config.php) and another script for the SQL (config.sql).  We will upsert configuration commands to these scripts if they need to be added or changed.

here are the steps to follow:
1. filter the data rows to include only those rows where the 2-letter state code appears in the "states" column.
2. For each row, generate an appropriate suitecrm configuration PHP command as follows.  Substitute module, fieldname, label, fieldtype, fieldlen, and requiredTF values from the metadata input file:

> $dictionary['module']['fields']['fieldname'] = array(
    'name' => 'fieldname',
    'vname' => 'label',
    'type' => 'fieldtype',
    'len' => 'fieldlen',
    'required' => requiredTF,
);

3. Generate a suiteCrm SQL DDL for the creation of the custom field in the database using the module as the table name and fieldname as the field name, etc.

4. Check in the existing configuration script in the argument_3 directory for that module-fields-fieldname combination.  
 - If it already exists:
   - in the PHP script, replace the old configuration command with the new configuration command, in case something has changed.
   - replace the old SQL DDL with the SQL DDL.  The SQL command should be idempotent; that is, if the column does not exist, it should create it, but if the column does exist, it should modify it. 
 - If it does not exist already, append the new field command to the end of each file.

## Example
Given the following CSV input file:
> module	fieldname	states	label	fieldtype	fieldlen	requiredTF

> Accounts	foo	AL,AK,FY	"Foo Field"	varchar	255	false

If we run 
> UpsertCustomFields AK inputFile outputDir

then outputDir.php should include the following:

> $dictionary['Accounts']['fields']['foo'] = array(
    'name' => 'foo',
    'vname' => 'Foo Field',
    'type' => 'varchar',
    'len' => '255',
    'required' => false,
);

and outputDir.sql should include something like the following:

> ALTER TABLE Accounts ADD COLUMN foo VARCHAR(255) NULL;

## Roadmap
 - nothing at this time