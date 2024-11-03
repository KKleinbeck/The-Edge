export default function() {
    // const canApplyDefaultRolls = li => {
    //     return true
    // };

    Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
        // html.find(".damage-apply-box").click(ev => {
        //     // because for some stupid reasons we cannot use data tags here, in chat messages
        //     const parts = ev.currentTarget.className.split(" ")
        //     const targetIDs = parts[2].split("targetID-")
        //     const dmgRes = parts[3].split("dmg-")
        //     const sceneID = parts[4].split("sceneID-")[1]
        //     targetIDs.shift()
        //     dmgRes.shift()
        //     console.log(ev.currentTarget)
        //     let scene = getScene(sceneID)
        //     let targets = getTargets(scene, targetIDs)
        //     for (const target of targets) {
        //         for (const dmg of dmgRes) applyDamage(target, dmg);
        //     }
        // })
    })
}