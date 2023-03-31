import { AllNexusNamedOutputTypeDefs, FieldOutConfig, FieldResolver, GetGen } from "nexus/dist/core";
import { NexusPlugin } from "nexus/dist/plugin";

export interface PaginationParams {
    skip: number;
    take: number;
}

interface CustomPaginationResolveContextFields {
    /**
     * Variables that can be passed to prisma
     * @interface {skip: number, take: number}
     */
    paginationParams: PaginationParams;
    /**
     * Calculates the page info
     * @param count total count of items in table
     * @returns {page: number, nextPage: number, totalPages: number}
     */
    calculatePageInfo: (count: number) => {
        page: number;
        nextPage: number;
        totalPages: number;
    };
}

declare type PaginationResolveArgs<TypeName extends string, FieldName extends string> = Parameters<FieldResolver<TypeName, FieldName>>;
declare type PaginationResolveReturn<TypeName extends string, FieldName extends string> = ReturnType<FieldResolver<TypeName, FieldName>>;
/** Redefine the default resolve function to include our custom context types */
export declare type PaginationResolve<TypeName extends string, FieldName extends string> = (root: PaginationResolveArgs<TypeName, FieldName>[0], args: PaginationResolveArgs<TypeName, FieldName>[1], ctx: PaginationResolveArgs<TypeName, FieldName>[2] & CustomPaginationResolveContextFields, info: PaginationResolveArgs<TypeName, FieldName>[3]) => PaginationResolveReturn<TypeName, FieldName>;
/** Define the query field config to extend the default */
export declare type PaginatedQueryFieldConfig<TypeName extends string = any, FieldName extends string = any> = Omit<FieldOutConfig<TypeName, FieldName>, 'resolve' | 'type'> & {
    type: GetGen<'allOutputTypes', string> | AllNexusNamedOutputTypeDefs;
    resolve: PaginationResolve<TypeName, FieldName>;
} & PaginationFieldPluginOptions;
/** Fields that are available on the global config and field config  */
interface SharedPluginOptions {
    /**
     * Change the default page size
     * @default 25
     * */
    defaultPageSize?: number;
}
interface PaginationPluginOptions extends SharedPluginOptions {
    /**
     * Use a different name for the generated type
     * @default Paginated{fieldName}s
     * @param targetTypeName the type of the model we are pagination
     * @returns {string}
     * */
    getGeneratedTypename?: (targetTypeName: string) => string;
}
interface PaginationFieldPluginOptions extends SharedPluginOptions {
    /**
     * Use a different name for the generated type for a specific field
     * @default Paginated{fieldName}s or something else if getGeneratedTypename is defined
     */
    generatedTypename?: string;
}
/**
 * A nexus plugin to help with offset/limit pagination, used with `t.paginatedQueryField`
 * Automatically generates pagination fields for a model.
 * Adds functions to get the params and calculate page info to the context object.
 */
export declare const paginationPlugin: (config?: PaginationPluginOptions) => NexusPlugin;
export {};
