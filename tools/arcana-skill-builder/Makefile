-include .env
export

.PHONY: install generate generate-no-ai clean

install:
	npm install

generate: install
	rm -rf out/arcana-system
	npm run generate
	python3 ../../.agents/skills/skill-creator/scripts/package_skill.py out/arcana-system out
	rm -rf ../../.agents/skills/arcana-system
	cp -r out/arcana-system ../../.agents/skills/arcana-system

generate-no-ai: install
	rm -rf out/arcana-system
	SKIP_AI=true npm run generate
	python3 ../../.agents/skills/skill-creator/scripts/package_skill.py out/arcana-system out
	rm -rf ../../.agents/skills/arcana-system
	cp -r out/arcana-system ../../.agents/skills/arcana-system

clean:
	rm -rf out
