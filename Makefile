install: install-deps

start:
	npm start

install-deps:
	npm install

build:
	rm -rf build
	npm run build

test:
	npm test

lint:
	npx eslint . --ext js,jsx,ts,tsx

publish:
	surge build aldarg.surge.sh

.PHONY: test
