-include .env
export

.PHONY: install generate generate-no-ai clean

install:
	npm install

generate: install
	rm -rf out/arcana-reference
	npm run generate
	PYTHONPATH=../../.agents/skills/skill-creator python3 ../../.agents/skills/skill-creator/scripts/package_skill.py out/arcana-reference out
	rm -rf ../../.agents/skills/arcana-reference
	cp -r out/arcana-reference ../../.agents/skills/arcana-reference

generate-no-ai: install
	rm -rf out/arcana-reference
	SKIP_AI=true npm run generate
	PYTHONPATH=../../.agents/skills/skill-creator python3 ../../.agents/skills/skill-creator/scripts/package_skill.py out/arcana-reference out
	rm -rf ../../.agents/skills/arcana-reference
	cp -r out/arcana-reference ../../.agents/skills/arcana-reference

clean:
	rm -rf out
