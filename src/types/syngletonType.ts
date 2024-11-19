import { GInterface } from '../interface/GInterface'

export type SingletonDerRes<
	GType extends Pick<GInterface, 'Ephemeral' | 'Volatile'>
> = {
	derive: GType['Ephemeral']['derive'] & GType['Volatile']['derive']
	resolve: GType['Ephemeral']['resolve'] & GType['Volatile']['resolve']
}


