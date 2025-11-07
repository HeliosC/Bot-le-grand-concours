const { GuildMember, Guild } = require("discord.js");
const { rolesID, usersID } = require("./constants/constants");

/** 
 * @param {GuildMember} member 
 * @param {Guild} guild 
 * @returns {Boolean}
*/
module.exports.isMod = function(member, guild) {
	if (!member) return false
	if (member.id == usersID.helios) return true

	for (const roleID of [rolesID.admin, rolesID.moderator, rolesID.test]) {
		let guildRole = guild.roles.cache.find(r => r.id == roleID)

		if (guildRole && member.roles.cache.has(roleID)) {
			return true
		}
	}
	return false
}