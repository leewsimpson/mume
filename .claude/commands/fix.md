We need to fix this bug: 
<bug>
 fix: $ARGUMENTS
 </bug>

 ** Mandatory Steps **
 1. Review the requirements and acceptance criteria to see if there is an issue with the requirements.  
 * For minor changes (new or changed acceptance criteria), update the requirements and proceed with step 2.
 * for major change (new story). Add and update requirements in `scripts/ralph/prd.json`, asking the user for more details if required.  Then do not proceed with this 'fix' - inform the user of the new requirement added and stop.
 2. Review the automated tests to see why the issue was not picked up.  
 3. Create a new test, or update and existing test.
 3. Fix the issue.
 4. Ensure this new test now passes.