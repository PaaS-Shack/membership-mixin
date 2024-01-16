"use strict";

const Errors = require("moleculer").Errors;

const FIELDS = {
    owner: {
        type: "string",
        readonly: true,
        required: true,
        populate: {
            action: "v1.accounts.resolve",
            params: {
                fields: ["id", "username", "fullName", "avatar"]
            }
        },
        onCreate: ({ ctx }) => ctx.meta.userID,
        //validate: "validateOwner"
    },
    members: {
        type: "array",
        items: { type: "string", empty: false },
        readonly: true,
        onCreate: ({ ctx }) => (ctx.meta.userID ? [ctx.meta.userID] : []),
        //validate: "validateMembers",
        populate: {
            action: "v1.accounts.resolve",
            params: {
                fields: ["id", "username", "fullName", "avatar"]
            }
        }
    },
    public: {
        type: "boolean",
        readonly: true,
        default: false
    },
}

const SCOPE = {

    membership(query, ctx) {
        if (!ctx) return;

        if (!query) return;

        if (ctx.meta.userID) {
            query.members = ctx.meta.userID;
        }

        return query;
    },
}

module.exports = function (opts = { permissions: 'default' }) {

    return {

        settings: {
            fields: FIELDS,

            scopes: SCOPE,
            defaultScopes: ["membership"]
        },
        actions: {
            addMembers: {
                description: "Add members to the entity",
                rest: {
                    method: "POST",
                    path: "/:id/members"
                },
                params: {
                    id: {
                        type: "string",
                        empty: false,
                        optional: false
                    },
                    member: {
                        type: "string",
                        empty: false,
                        optional: false
                    }
                },
                async handler(ctx) {

                    const { id, member } = ctx.params;

                    // get the entity
                    const entity = await this.resolveEntities(ctx, {
                        id,
                        fields: ["id", "owner", "members"]
                    });

                    // check entity
                    if (!entity) {
                        throw new Errors.MoleculerClientError("The entity does not exist", 403, "ERR_ENTITY_NOT_FOUND");
                    }

                    // check if the user is the owner
                    if (entity.owner !== ctx.meta.userID) {
                        throw new Errors.MoleculerClientError("Only the owner can add members", 403, "ERR_ONLY_OWNER");
                    }

                    // check if the user is already a member
                    if (entity.members.includes(member)) {
                        throw new Errors.MoleculerClientError("The user is already a member", 403, "ERR_ALREADY_MEMBER");
                    }

                    // resolve the member
                    const memberEntity = await ctx.call("v1.accounts.resolve", {
                        id: member,
                        fields: ["id", "username", "fullName", "avatar"]
                    });

                    // check if the member exists
                    if (!memberEntity) {
                        throw new Errors.MoleculerClientError("The user does not exist", 403, "ERR_MEMBER_NOT_FOUND");
                    }

                    // add the member
                    const update = {
                        id: entity.id,
                        $addToSet: {
                            members: member
                        }
                    };

                    // update the entity
                    return this.updateEntity(ctx, update, { raw: true });
                }
            },

            removeMembers: {
                description: "Remove members from the entity",
                rest: {
                    method: "DELETE",
                    path: "/:id/members"
                },
                params: {
                    id: {
                        type: "string",
                        empty: false,
                        optional: false
                    },
                    member: {
                        type: "string",
                        empty: false,
                        optional: false
                    }
                },
                async handler(ctx) {

                    const { id, member } = ctx.params;

                    // get the entity
                    const entity = await this.resolveEntities(ctx, {
                        id,
                        fields: ["id", "owner", "members"]
                    });

                    // check entity
                    if (!entity) {
                        throw new Errors.MoleculerClientError("The entity does not exist", 403, "ERR_ENTITY_NOT_FOUND");
                    }

                    // check if the user is the owner
                    if (entity.owner !== ctx.meta.userID) {
                        throw new Errors.MoleculerClientError("Only the owner can remove members", 403, "ERR_ONLY_OWNER");
                    }

                    // check if the user is already a member
                    if (!entity.members.includes(member)) {
                        throw new Errors.MoleculerClientError("The user is not a member", 403, "ERR_NOT_MEMBER");
                    }

                    // remove the member
                    const update = {
                        id: entity.id,
                        $pull: {
                            members: member
                        }
                    };

                    // update the entity
                    return this.updateEntity(ctx, update, { raw: true });
                }
            },

            transferOwnership: {
                description: "Transfer the ownership of the entity",
                rest: {
                    method: "POST",
                    path: "/:id/owner"
                },
                params: {
                    id: {
                        type: "string",
                        empty: false,
                        optional: false
                    },
                    owner: {
                        type: "string",
                        empty: false,
                        optional: false
                    }
                },
                async handler(ctx) {

                    const { id, owner } = ctx.params;

                    // get the entity
                    const entity = await this.resolveEntities(ctx, {
                        id,
                        fields: ["id", "owner", "members"]
                    });

                    // check entity
                    if (!entity) {
                        throw new Errors.MoleculerClientError("The entity does not exist", 403, "ERR_ENTITY_NOT_FOUND");
                    }

                    // check if the user is the owner
                    if (entity.owner !== ctx.meta.userID) {
                        throw new Errors.MoleculerClientError("Only the owner can transfer the ownership", 403, "ERR_ONLY_OWNER");
                    }

                    // check if the user is already a member
                    if (!entity.members.includes(owner)) {
                        throw new Errors.MoleculerClientError("The user is not a member", 403, "ERR_NOT_MEMBER");
                    }

                    // resolve the new owner
                    const ownerEntity = await ctx.call("v1.accounts.resolve", {
                        id: owner,
                        fields: ["id", "username", "fullName", "avatar"]
                    });

                    // check if the member exists
                    if (!ownerEntity) {
                        throw new Errors.MoleculerClientError("The user does not exist", 403, "ERR_MEMBER_NOT_FOUND");
                    }                    

                    // transfer the ownership
                    const update = {
                        id: entity.id,
                        owner
                    };

                    // update the entity
                    return this.updateEntity(ctx, update, { raw: true });
                }
            },
        }

    };
};

module.exports.DSCOPE = ['membership']
module.exports.SCOPE = SCOPE
module.exports.FIELDS = FIELDS
