import zod from 'zod';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
export declare const routerUsageSchema: zod.ZodObject<{
    current: zod.ZodOptional<zod.ZodObject<{
        provider: zod.ZodString;
        model: zod.ZodString;
    }, zod.core.$strip>>;
    last: zod.ZodOptional<zod.ZodObject<{
        provider: zod.ZodString;
        model: zod.ZodString;
        turn: zod.ZodNumber;
        step: zod.ZodNumber;
    }, zod.core.$strip>>;
    routes: zod.ZodRecord<zod.ZodString, zod.ZodObject<{
        inputTokens: zod.ZodNumber;
        outputTokens: zod.ZodNumber;
        cacheReadTokens: zod.ZodNumber;
        cacheWriteTokens: zod.ZodNumber;
        reasoningTokens: zod.ZodNumber;
    }, zod.core.$strip>>;
}, zod.core.$strip>;
export type RouterUsage = zod.infer<typeof routerUsageSchema>;
export declare const routerUsageProjectionDefinition: {
    key: string;
    stateVersion: number;
    stateSchema: zod.ZodObject<{
        current: zod.ZodOptional<zod.ZodObject<{
            provider: zod.ZodString;
            model: zod.ZodString;
        }, zod.core.$strip>>;
        last: zod.ZodOptional<zod.ZodObject<{
            provider: zod.ZodString;
            model: zod.ZodString;
            turn: zod.ZodNumber;
            step: zod.ZodNumber;
        }, zod.core.$strip>>;
        routes: zod.ZodRecord<zod.ZodString, zod.ZodObject<{
            inputTokens: zod.ZodNumber;
            outputTokens: zod.ZodNumber;
            cacheReadTokens: zod.ZodNumber;
            cacheWriteTokens: zod.ZodNumber;
            reasoningTokens: zod.ZodNumber;
        }, zod.core.$strip>>;
    }, zod.core.$strip>;
    init: () => RouterUsage;
    apply(state: RouterUsage, event: SessionEvent): RouterUsage;
    wire: {
        viewSchema: zod.ZodObject<{
            current: zod.ZodOptional<zod.ZodObject<{
                provider: zod.ZodString;
                model: zod.ZodString;
            }, zod.core.$strip>>;
            last: zod.ZodOptional<zod.ZodObject<{
                provider: zod.ZodString;
                model: zod.ZodString;
                turn: zod.ZodNumber;
                step: zod.ZodNumber;
            }, zod.core.$strip>>;
            routes: zod.ZodRecord<zod.ZodString, zod.ZodObject<{
                inputTokens: zod.ZodNumber;
                outputTokens: zod.ZodNumber;
                cacheReadTokens: zod.ZodNumber;
                cacheWriteTokens: zod.ZodNumber;
                reasoningTokens: zod.ZodNumber;
            }, zod.core.$strip>>;
        }, zod.core.$strip>;
        view: (state: RouterUsage) => RouterUsage;
    };
};
//# sourceMappingURL=usage-projection.d.ts.map