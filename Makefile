# Makefile

.DEFAULT_GOAL := help

###################
# Main Operations #
###################

run: ## Run the app locally
	uv run python -m app.main

###################
# Dependencies    #
###################

sync: ## Sync all dependencies including dev dependencies
	rm -rf .venv uv.lock
	uv sync --all-extras --all-packages

###################
# Testing        #
###################

BADGE_DIR := .github/badges

$(BADGE_DIR):
	mkdir -p $(BADGE_DIR)

test-app: $(BADGE_DIR) ## Run tests for app only with badge generation
	uv run python -m pytest app/tests --cov=app --cov-report=term-missing  --cov-report=html --cov-report=xml:coverage-app.xml -v --junitxml=junit-app.xml || true
	uv run genbadge coverage -i coverage-app.xml -o $(BADGE_DIR)/coverage-app.svg
	uv run genbadge tests -i junit-app.xml -o $(BADGE_DIR)/tests-app.svg

test-engine: $(BADGE_DIR) ## Run tests for engine only with badge generation
	uv run python -m pytest engine/tests --cov=engine --cov-report=term-missing --cov-report=html --cov-report=xml:coverage-engine.xml -v --junitxml=junit-engine.xml || true
	uv run genbadge coverage -i coverage-engine.xml -o $(BADGE_DIR)/coverage-engine.svg
	uv run genbadge tests -i junit-engine.xml -o $(BADGE_DIR)/tests-engine.svg

test-coverage: test-app test-engine ## Run all tests and generate badges
	@echo "All tests completed and badges generated"
	@rm -f coverage-*.xml junit-*.xml

###################
# Publishing     #
###################

build: clean ## Build the package for distribution
	uv run python -m build

upload: ## Upload the package to PyPI
	twine upload dist/*

publish: build upload ## Build and upload the package to PyPI

###################
# Cleanup        #
###################

clean: ## Clean build artifacts, caches, logs, and virtual environment
	rm -rf .venv uv.lock
	rm -rf build/ dist/ .eggs/ .pytest_cache/ .coverage htmlcov/ .coverage.*
	find . -type d -name '*.egg-info' -exec rm -rf {} +
	find . -type d -name '__pycache__' -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	find . -type f -name '*.pyo' -delete
	find . -type f -name '*.pyd' -delete
	rm -rf logs/*.log
	rm -rf logs/*.log.*
	rm -f coverage-*.xml junit-*.xml

###################
# Help           #
###################

.PHONY: run deploy test test-coverage clean sync help build upload publish

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
