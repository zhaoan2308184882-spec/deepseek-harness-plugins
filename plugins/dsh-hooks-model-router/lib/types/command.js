function success(text) {
    return { kind: 'success', text };
}
function phaseCommand(ctx, router, name) {
    ctx.commands.register({
        name: name === 'planner' ? 'plan' : name === 'executor' ? 'exec' : 'review',
        description: `route subsequent requests through the ${name} model`,
        handler: ({ agent }) => {
            router.setPhase(agent.session, name);
            return success(`Model router phase: ${name}`);
        },
    });
}
/** Register the four direct UI slash commands through the commands service. */
export function registerRouterCommands(ctx, router) {
    phaseCommand(ctx, router, 'planner');
    phaseCommand(ctx, router, 'executor');
    phaseCommand(ctx, router, 'reviewer');
    ctx.commands.register({
        name: 'router',
        description: 'show model-router phase or return it to automatic routing',
        input: { hint: '[auto]' },
        handler: ({ agent, rawInput }) => {
            const input = rawInput.trim().toLowerCase();
            if (input.length === 0)
                return success(`Model router phase: ${router.getPhase(agent.session)}`);
            if (input !== 'auto')
                return { kind: 'error', text: 'Usage: /router [auto]' };
            router.setPhase(agent.session, 'auto');
            return success('Model router phase: auto');
        },
    });
}
//# sourceMappingURL=command.js.map