alter table agent_configs
  add column llm_provider text not null default 'anthropic'
    check (llm_provider in ('anthropic', 'openai', 'deepseek')),
  add column llm_model text;

comment on column agent_configs.llm_provider is 'Which LLM API ai-engine calls to generate replies for this tenant.';
comment on column agent_configs.llm_model is 'Optional provider-specific model override; ai-engine falls back to a per-provider default when null.';
