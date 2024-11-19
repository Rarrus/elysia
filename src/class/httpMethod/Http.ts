import { LocalSchema, Schema } from '../../../types/handleInterface'
import {
	DefinitionBase,
	HTTPMethod,
	JoinPath,
	LocalHook,
	MetadataBase,
	SingletonBase
} from '../../../types'
import { SingletonDerRes } from '../../../types/syngletonType'
import { customHTTPMethod } from '../../../types/HttpType'
import { GInterface } from '../../../interface/GInterface'

type localHookMethod<BasePath extends string, Path extends string> = LocalHook<
	LocalSchema,
	Schema,
	SingletonBase & SingletonDerRes,
	DefinitionBase['error'],
	MetadataBase['macro'],
	JoinPath<BasePath, Path>
>

export default class Http<GType extends GInterface> {
	[x: string]: any

	all(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<method, BasePath, Path, Handle>>(
			path,
			handler,
			'ALL',
			hook
		)
	}

	connect(
		path: Path,
		handler: Handle,
		hook?: localHookMethod<BasePath, Path>
	) {
		this.httpmethod<customHTTPMethod<'connect', BasePath, Path, Handle>>(
			path,
			handler,
			'CONNECT',
			hook
		)
	}

	delete(
		path: Path,
		handler: Handle,
		hook?: localHookMethod<BasePath, Path>
	) {
		this.httpmethod<customHTTPMethod<'delete', BasePath, Path, Handle>>(
			path,
			handler,
			'DELETE',
			hook
		)
	}

	get(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<'get', BasePath, Path, Handle>>(
			path,
			handler,
			'GET',
			hook
		)
	}

	head(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<'head', BasePath, Path, Handle>>(
			path,
			handler,
			'HEAD',
			hook
		)
	}

	options(
		path: Path,
		handler: Handle,
		hook?: localHookMethod<BasePath, Path>
	) {
		this.httpmethod<customHTTPMethod<'options', BasePath, Path, Handle>>(
			path,
			handler,
			'OPTIONS',
			hook
		)
	}

	patch(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<'patch', BasePath, Path, Handle>>(
			path,
			handler,
			'PATCH',
			hook
		)
	}

	post(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<'POST', BasePath, Path, Handle>>(
			path,
			handler,
			'POST',
			hook
		)
	}

	put(path: Path, handler: Handle, hook?: localHookMethod<BasePath, Path>) {
		this.httpmethod<customHTTPMethod<'PUT', BasePath, Path, Handle>>(
			path,
			handler,
			'PUT',
			hook
		)
	}

	routes<Method extends HTTPMethod>(
		method: Method,
		path: Path,
		handler: Handle,
		hook?: localHookMethod<BasePath, Path>
	) {
		this.httpmethod<customHTTPMethod<Method, BasePath, Path, Handle>>(
			path,
			handler,
			method.toUpperCase(),
			hook
		)
	}

	private httpmethod<Type>(
		path: Path,
		handler: Handle,
		method: string,
		hook?: localHookMethod<BasePath, Path>
	): Type {
		{
			this.add(method, path, handler as any, hook)

			return this as any
		}
	}
}
