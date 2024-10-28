export default function() {
    const canApplyDefaultRolls = li => {
        const message = game.messages.get(li.data("messageId"));
        console.log(li)
        console.log(message)
        return true
    };

    const getScene = (sceneID) => {
        for (const _scene of game.scenes) {
            if (_scene._id === sceneID) return _scene
        }
        return undefined
    }

    const getTargets = (scene, targetIDs) => {
        const targets = []
        for (const token of scene.tokens) {
            if (targetIDs.includes(token.id.toUpperCase())) {
                targets.push(token.actor)
            }
        }
        return targets
    }

    const applyDamage = async(target, damage) => {
        console.log(target)
        target.system.health.value -= damage
    }

    Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
        html.find(".damage-apply-box").click(ev => {
            // because for some stupid reasons we cannot use data tags here, in chat messages
            const parts = ev.currentTarget.className.split(" ")
            const targetIDs = parts[2].split("targetID-")
            const dmgRes = parts[3].split("dmg-")
            const sceneID = parts[4].split("sceneID-")[1]
            targetIDs.shift()
            dmgRes.shift()
            console.log(ev.currentTarget)
            let scene = getScene(sceneID)
            let targets = getTargets(scene, targetIDs)
            for (const target of targets) {
                for (const dmg of dmgRes) applyDamage(target, dmg);
            }
        })
    })
}