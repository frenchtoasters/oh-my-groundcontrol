import { describe, expect, test } from 'bun:test';
import { createDoubleConfirmationHook } from './index';

describe('double-confirmation hook', () => {
  test('appends nudge to background_task output when enabled', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output = {
      title: 'Task result',
      output: 'Task completed successfully',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_1' },
      output,
    );

    expect(String(output.output)).toContain('[Verification Required]');
  });

  test('appends nudge to task output when enabled', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output = {
      title: 'Task result',
      output: 'Task completed',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'task', callID: 'call_2' },
      output,
    );

    expect(String(output.output)).toContain('[Verification Required]');
  });

  test('does not append nudge to non-task tools', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output = {
      title: 'Grep result',
      output: 'Found 5 matches',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'grep', callID: 'call_3' },
      output,
    );

    expect(String(output.output)).not.toContain('[Verification Required]');
  });

  test('does not fire when disabled', async () => {
    const hook = createDoubleConfirmationHook({ enabled: false });
    const output = {
      title: 'Task result',
      output: 'Task completed',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_4' },
      output,
    );

    expect(String(output.output)).not.toContain('[Verification Required]');
  });

  test('fires only once per callID (max 1 confirmation)', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output1 = {
      title: 'Task result',
      output: 'First call',
      metadata: {},
    };
    const output2 = {
      title: 'Task result',
      output: 'Same call again',
      metadata: {},
    };

    // First call — nudge appended
    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_5' },
      output1,
    );
    expect(String(output1.output)).toContain('[Verification Required]');

    // Same callID — no nudge
    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_5' },
      output2,
    );
    expect(String(output2.output)).not.toContain('[Verification Required]');
  });

  test('fires for different callIDs', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output1 = {
      title: 'Task result',
      output: 'Call A',
      metadata: {},
    };
    const output2 = {
      title: 'Task result',
      output: 'Call B',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_A' },
      output1,
    );
    await hook['tool.execute.after'](
      { tool: 'task', callID: 'call_B' },
      output2,
    );

    expect(String(output1.output)).toContain('[Verification Required]');
    expect(String(output2.output)).toContain('[Verification Required]');
  });

  test('defaults to disabled when no config provided', async () => {
    const hook = createDoubleConfirmationHook();
    const output = {
      title: 'Task result',
      output: 'Task completed',
      metadata: {},
    };

    await hook['tool.execute.after'](
      { tool: 'background_task', callID: 'call_6' },
      output,
    );

    expect(String(output.output)).not.toContain('[Verification Required]');
  });

  test('skips nudge when callID and sessionID are both undefined', async () => {
    const hook = createDoubleConfirmationHook({ enabled: true });
    const output = {
      title: 'Task result',
      output: 'Task completed',
      metadata: {},
    };

    await hook['tool.execute.after']({ tool: 'background_task' }, output);

    // No identifier to dedup against — nudge is silently skipped
    expect(String(output.output)).not.toContain('[Verification Required]');
  });
});
