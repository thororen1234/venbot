import { defineCommand } from "~/Commands";
import Config from "~/config";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, testDiscordVersion } from "~/modules/discordTracker";
import { reply } from "~/util/discord";
import { fetchJson } from "~/util/fetch";

defineCommand({
    enabled: Config.reporter.enabled,

    name: "reporter",
    description: "Run the Vencord reporter workflow",
    usage: "[prNum  | ref = dev] [branch = both]",
    aliases: ["report", "vencord-reporter", "test-patches", "test"],
    allowedRoles: [Config.roles.mod],

    async execute({ msg }, refOrPr = DefaultReporterBranch, branch = "both") {
        let ref = refOrPr;
        let pr: { repo: string; branch: string; } | undefined;

        if (/^#(\d+)$/.test(refOrPr)) {
            const prNum = refOrPr.match(/\d+/)![0];
            let prData;
            try {
                prData = await fetchJson(`https://api.github.com/repos/Vendicated/Vencord/pulls/${prNum}`);
            } catch (e) {
                return reply(msg, `Failed to fetch PR #${prNum}.`);
            }

            pr = {
                repo: prData.head.repo.full_name as string,
                branch: prData.head.ref as string,
            };
            ref = DefaultReporterBranch;
        }

        testDiscordVersion(
            branch as any,
            {
                stable: BotState.discordTracker?.stableHash!,
                canary: BotState.discordTracker?.canaryHash!
            },
            {
                ref,
                pr,
                prNumber: pr ? refOrPr : undefined,
                shouldLog: false,
                shouldUpdateStatus: !pr && ref === DefaultReporterBranch,
                onSubmit: (report, data) => {
                    let prLinkText = "";
                    if (report.prNumber) {
                        prLinkText = `[${report.prNumber}](https://github.com/Vendicated/Vencord/pull/${report.prNumber})`;
                        data.embeds[0].description = `${prLinkText}\n${data.embeds[0].description || ""}`;
                    }
                    reply(msg, data);
                }
            }
        );

        reply(msg, pr
            ? `Now testing [${refOrPr}](<https://github.com/Vendicated/Vencord//pull/${refOrPr}>) (\`${pr.repo}@${pr.branch}\`)!`
            : "Now testing!"
        );
    },
});
