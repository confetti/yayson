# Release process

1. Bump version number in package.json
2. git commit -m 'Version 1.0.5'
3. git tag -a v1.0.5 -m "Version 1.0.5"
4. npm publish ./ --tag 1.0.5
