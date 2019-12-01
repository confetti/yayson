# Release process

1. Compile with: npm run build
2. Bump version number in package.json
3. git commit -m 'Version 1.0.5'
4. git tag -a v1.0.5 -m "Version 1.0.5"
5. git push
6. git push --tags
7. npm publish
