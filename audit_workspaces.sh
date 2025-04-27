# This script audits the npm packages in each workspace of a monorepo.
echo "Starting npm audit for all workspaces..."
echo "Auditing root package.json..."
npm audit
echo "Audit completed for root package.json"
cd workspaces/client
echo "Auditing client workspace..."
npm audit
echo "Audit completed for client workspace"
cd ../dashboard
echo "Auditing dashboard workspace..."
npm audit
echo "Audit completed for dashboard workspace"
cd ../demo
echo "Auditing demo workspace..."
npm audit
echo "Audit completed for demo workspace"
cd ../server
echo "Auditing server workspace..."
npm audit
echo "Audit completed for server workspace"