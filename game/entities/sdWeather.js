/*
 
 
 
 
	Test specific event on server (will break any other event):

		sdWorld.entity_classes.sdWeather.only_instance._time_until_event = 0
		sdWorld.server_config.GetAllowedWorldEvents = ()=>[ 8 ];
		sdWorld.server_config.GetDisallowedWorldEvents = ()=>[];


	Stop all events:

		sdWorld.server_config.GetAllowedWorldEvents = ()=>[];
 
*/
import sdWorld from '../sdWorld.js';
import sdEntity from './sdEntity.js';
import sdEffect from './sdEffect.js';
import sdAsteroid from './sdAsteroid.js';

import sdCube from './sdCube.js';
import sdBlock from './sdBlock.js';
import sdCharacter from './sdCharacter.js';
import sdGun from './sdGun.js';
import sdAsp from './sdAsp.js';
import sdGrass from './sdGrass.js';
import sdCom from './sdCom.js';
import sdVirus from './sdVirus.js';
import sdBG from './sdBG.js';
import sdEnemyMech from './sdEnemyMech.js';
import sdBadDog from './sdBadDog.js';
import sdRift from './sdRift.js';
import sdCrystal from './sdCrystal.js';
import sdDrone from './sdDrone.js';
import sdSpider from './sdSpider.js';
import sdAmphid from './sdAmphid.js';


import sdRenderer from '../client/sdRenderer.js';

class sdWeather extends sdEntity
{
	static init_class()
	{
		sdWeather.img_rain = sdWorld.CreateImageFromFile( 'rain' );
		sdWeather.img_scary_mode = sdWorld.CreateImageFromFile( 'scary_mode' );
		
		sdWeather.only_instance = null;
		
		sdWeather.last_crystal_near_quake = null; // Used to damage left over crystals. Could be used to damage anything really
		
		sdWeather.pattern = [];
		for ( var i = 0; i < 300; i++ )
		sdWeather.pattern.push({ x:Math.random(), y:Math.random(), last_vis:false, last_y:0, last_x:0 });
		
		sdWorld.entity_classes[ this.name ] = this; // Register for object spawn
	}
	
	IsGlobalEntity() // Should never change
	{ return true; }
	
	get hitbox_x1() { return 0; }
	get hitbox_x2() { return 0; }
	get hitbox_y1() { return 0; }
	get hitbox_y2() { return 0; }
	
	get hard_collision()
	{ return false; }
	
	constructor( params )
	{
		super( params );
		
		this.x = 0;
		this.y = 0;
		
		this._next_grass_seed = 0;
		
		if ( sdWeather.only_instance )
		sdWeather.only_instance.remove();
	
		sdWeather.only_instance = this;
		
		this._rain_amount = 0;
		this.raining_intensity = 0;
		
		this._asteroid_spam_amount = 0;
		
		this._invasion = false;
		this._invasion_timer = 0; // invasion length timer
		this._invasion_spawn_timer = 0; // invasion spawn timer
		this._invasion_spawns_con = 0; // invasion spawn conditions, needs to be 0 or invasion can't end. Counter for falkoks left to spawn
		
		this._quake_scheduled_amount = 0;
		this.quake_intensity = 0;
		
		//this._rain_offset = 0;
		this._time_until_event = 30 * 30; // 30 seconds since world reset
		this._daily_events = [ 8 ];
		
		this._asteroid_timer = 0; // 60 * 1000 / ( ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 ) / 800 )
		this._asteroid_timer_scale_next = 0;
		
		this.day_time = 30 * 60 * 24 / 3;
		
		// World bounds, but slow
		this.x1 = 0;
		this.y1 = 0;
		this.x2 = 0;
		this.y2 = 0;
		
		//this.SetHiberState( sdEntity.HIBERSTATE_HIBERNATED_NO_COLLISION_WAKEUP, false );
	}
	GetDailyEvents() // Basically this function selects 4 random allowed events + earthquakes
	{
		this._daily_events = [ 8 ]; // Always enable earthquakes so ground can regenerate
		let allowed_event_ids = ( sdWorld.server_config.GetAllowedWorldEvents ? sdWorld.server_config.GetAllowedWorldEvents() : undefined ) || [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ];
				
		let disallowed_ones = ( sdWorld.server_config.GetDisallowedWorldEvents ? sdWorld.server_config.GetDisallowedWorldEvents() : [] );
				
		//allowed_event_ids = [ 8 ]; // Hack
				
		for ( let d = 0; d < allowed_event_ids.length; d++ )
		if ( disallowed_ones.indexOf( allowed_event_ids[ d ] ) !== -1 )
		{
			allowed_event_ids.splice( d, 1 );
			d--;
			continue;
		}
				
		if ( allowed_event_ids.length > 0 )
		{
			let n = allowed_event_ids[ ~~( Math.random() * allowed_event_ids.length ) ];
			let old_n = n;
			let daily_event_count = Math.min( allowed_event_ids.length, 4 );
			let time = 1000;
			while ( daily_event_count > 0 && time > 0 )
			{
				old_n = n;
				n = allowed_event_ids[ ~~( Math.random() * allowed_event_ids.length ) ];
				if ( old_n !== n )
				{
					this._daily_events.push( n );
					daily_event_count--;
				}
				time--;
			}
		}
		//console.log( this._daily_events );
	}
	TraceDamagePossibleHere( x,y, steps_max=Infinity )
	{
		for ( var yy = y; yy > sdWorld.world_bounds.y1 && steps_max > 0; yy -= 8, steps_max-- )
		if ( sdWorld.CheckWallExists( x, yy, null, null, [ 'sdBlock', 'sdDoor', 'sdWater' ] ) )
		return false;

		return true;
	}
	onThink( GSPEED ) // Class-specific, if needed
	{
		if ( sdWorld.is_server )
		{
			this.x1 = sdWorld.world_bounds.x1;
			this.y1 = sdWorld.world_bounds.y1;
			this.x2 = sdWorld.world_bounds.x2;
			this.y2 = sdWorld.world_bounds.y2;
			
			//return; // Hack
			
			this.day_time += GSPEED;
			if ( this.day_time > 30 * 60 * 24 )
			{
			this.day_time = 0;
			this.GetDailyEvents();
			}
			
			if ( this._invasion ) // Invasion event
			{
				this._invasion_timer -= 1 / 30  * GSPEED;
				this._invasion_spawn_timer -= 1 / 30 * GSPEED;
				if ( this._invasion_timer <= 0 && this._invasion_spawns_con <= 0 )
				{
					this._invasion = false;
					//console.log('Invasion clearing up!');
				}
				if ( this._invasion_spawn_timer <= 0 )
				{
					this._invasion_spawn_timer = 6 + ( Math.random() * 4 ) ;// Every 6+ to 10 seconds it will respawn enemies
					let ais = 0;

					for ( var i = 0; i < sdCharacter.characters.length; i++ )
					if ( sdCharacter.characters[ i ].hea > 0 )
					if ( !sdCharacter.characters[ i ]._is_being_removed )
					if ( sdCharacter.characters[ i ]._ai )
					{
						ais++;
					}

					let instances = 0;
					let instances_tot = 3 + ( ~~( Math.random() * 3 ) );

					let left_side = ( Math.random() < 0.5 );

					while ( instances < instances_tot && ais < 16 ) // max AI value up to 16 during invasion, but should be reduced if laggy for server
					{

						let character_entity = new sdCharacter({ x:0, y:0 });

						sdEntity.entities.push( character_entity );

						{
							let x,y;
							let tr = 1000;
							do
							{
								if ( left_side )
								x = sdWorld.world_bounds.x1 + 16 + 16 * instances;
								else
								x = sdWorld.world_bounds.x2 - 16 - 16 * instances;

								y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

								if ( character_entity.CanMoveWithoutOverlap( x, y, 0 ) )
								//if ( !character_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
								//if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) ) // Only spawn on ground
								{
									character_entity.x = x;
									character_entity.y = y;

									//sdWorld.UpdateHashPosition( ent, false );
									if ( Math.random() < 0.07 )
									{
										if ( Math.random() < 0.2 )
										{
											sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_FALKOK_PSI_CUTTER }) );
											character_entity._ai_gun_slot = 4;
										}
										else
										{
											sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_RAYGUN }) );
											character_entity._ai_gun_slot = 3;
										}
									}
									else
									{ 
										if ( Math.random() < 0.1 )
										{
											sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_F_MARKSMAN }) );
											character_entity._ai_gun_slot = 2;
										}
										else
										if ( Math.random() < 0.03 ) // was 1% but events are somewhat rarer now
										{
											sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_F_HEAVY_RIFLE }) );
											character_entity._ai_gun_slot = 2;
										}
										else
										{
											sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_FALKOK_RIFLE }) );
											character_entity._ai_gun_slot = 2;
										}
									}
									let falkok_settings;
									if ( character_entity._ai_gun_slot === 2 )
									falkok_settings = {"hero_name":"Falkok","color_bright":"#6b0000","color_dark":"#420000","color_bright3":"#6b0000","color_dark3":"#420000","color_visor":"#5577b9","color_suit":"#240000","color_suit2":"#2e0000","color_dark2":"#560101","color_shoes":"#000000","color_skin":"#240000","helmet1":false,"helmet2":true,"voice1":false,"voice2":false,"voice3":true,"voice4":false,"voice5":false,"voice6":true};
									if ( character_entity._ai_gun_slot === 3 || character_entity._ai_gun_slot === 4 ) // If Falkok spawns with Raygun or PSI-Cutter, change their looks Phoenix Falkok
									falkok_settings = {"hero_name":"Phoenix Falkok","color_bright":"#ffc800","color_dark":"#a37000","color_bright3":"#ffc800","color_dark3":"#a37000","color_visor":"#000000","color_suit":"#ffc800","color_suit2":"#ffc800","color_dark2":"#000000","color_shoes":"#a37000","color_skin":"#a37000","helmet1":false,"helmet12":true,"voice1":false,"voice2":false,"voice3":true,"voice4":false,"voice5":false,"voice6":true};

									character_entity.sd_filter = sdWorld.ConvertPlayerDescriptionToSDFilter_v2( falkok_settings );
									character_entity._voice = sdWorld.ConvertPlayerDescriptionToVoice( falkok_settings );
									character_entity.helmet = sdWorld.ConvertPlayerDescriptionToHelmet( falkok_settings );
									character_entity.title = falkok_settings.hero_name;
									if ( character_entity._ai_gun_slot === 2 ) // If a regular falkok spawns
									{
										character_entity.matter = 75;
										character_entity.matter_max = 75;

										character_entity.hea = 115; // 105 so railgun requires at least headshot to kill and body shot won't cause bleeding
										character_entity.hmax = 115;

										character_entity._damage_mult = 1 / 2.5; // 1 / 4 was too weak
									}

									if ( character_entity._ai_gun_slot === 3 || character_entity._ai_gun_slot === 4 ) // If a Phoenix Falkok spawns
									{
										character_entity.matter = 100;
										character_entity.matter_max = 100;

										character_entity.hea = 250; // It is a stronger falkok after all, although revert changes if you want
										character_entity.hmax = 250;

										character_entity._damage_mult = 1 / 1.5; // Rarer enemy therefore more of a threat?
									}	
									character_entity._ai = { direction: ( x > ( sdWorld.world_bounds.x1 + sdWorld.world_bounds.x2 ) / 2 ) ? -1 : 1 };
									character_entity._ai_enabled = sdCharacter.AI_MODEL_FALKOK;
									character_entity._ai_level = Math.floor( 1 + Math.random() * 3 ); // AI Levels from 1 to 3

									character_entity._matter_regeneration = 1 + character_entity._ai_level; // At least some ammo regen
									character_entity._jetpack_allowed = true; // Jetpack
									character_entity._recoil_mult = 1 - ( 0.0055 * character_entity._ai_level ); // Small recoil reduction based on AI level
									character_entity._jetpack_fuel_multiplier = 0.25; // Less fuel usage when jetpacking
									character_entity._ai_team = 1; // AI team 1 is for Falkoks, preparation for future AI factions
									character_entity._matter_regeneration_multiplier = 10; // Their matter regenerates 10 times faster than normal, unupgraded players
									//this._invasion_spawns_con -= 1;

									break;
								}

								tr--;
								if ( tr < 0 )
								{
									character_entity.death_anim = sdCharacter.disowned_body_ttl + 1;
									character_entity.remove();
									break;
								}
							} while( true );
						}

						instances++;
						ais++;
						this._invasion_spawns_con -= 1;
					}
				}
			}
			this._asteroid_timer += GSPEED;
			if ( this._asteroid_timer > 60 * 30 / ( ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 ) / 800 ) )
			{
				let ent = new sdAsteroid({ 
					x:sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 ), 
					y:sdWorld.world_bounds.y1 + 1
				});
				sdEntity.entities.push( ent );

				this._asteroid_timer = 0;
				this._asteroid_timer_scale_next = Math.random();
			}
			
			if ( this._asteroid_spam_amount > 0 )
			{
				this._asteroid_spam_amount -= GSPEED * 1;
				this._asteroid_timer += GSPEED * 40;
			}
			
			if ( this._rain_amount > 0 )
			{
				this.raining_intensity = Math.min( 100, this.raining_intensity + GSPEED * 0.1 );
				
				this._rain_amount -= this.raining_intensity / 100;
			}
			else
			{
				this.raining_intensity = Math.max( 0, this.raining_intensity - GSPEED * 0.1 );
			}
			
			if ( this._quake_scheduled_amount > 0 )
			{
				this._quake_scheduled_amount -= GSPEED;
				
				this.quake_intensity = Math.min( 100, this.quake_intensity + GSPEED * 0.3 );
			}
			else
			{
				this.quake_intensity = Math.max( 0, this.quake_intensity - GSPEED * 0.3 );
			}
			
			if ( this.raining_intensity > 50 )
			//if ( sdWorld.is_server ) Done before
			{
				sdWorld.last_hit_entity = null;
				
				//for ( var i = 0; i < 40; i++ )
				//if ( Math.random() < 100 / ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 ) )
				if ( sdWorld.time > this._next_grass_seed )
				{
					this._next_grass_seed = sdWorld.time + 100;
					
					let xx = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );

					if ( !sdWorld.CheckLineOfSight( xx, sdWorld.world_bounds.y1 + 4, xx, sdWorld.world_bounds.y2, null, null, sdCom.com_creature_attack_unignored_classes ) )
					{
						if ( sdWorld.last_hit_entity )
						if ( sdWorld.last_hit_entity.is( sdBlock ) )
						if ( sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND )
						{
							if ( sdWorld.last_hit_entity._plants === null )
							{
								let grass = new sdGrass({ x:sdWorld.last_hit_entity.x, y:sdWorld.last_hit_entity.y - 16, filter: sdWorld.last_hit_entity.filter, block:sdWorld.last_hit_entity  });
								sdEntity.entities.push( grass );

								sdWorld.last_hit_entity._plants = [ grass._net_id ];
							}
							else
							{
								for ( let i = 0; i < sdWorld.last_hit_entity._plants.length; i++ )
								{
									//let ent = sdEntity.entities_by_net_id_cache[ sdWorld.last_hit_entity._plants[ i ] ];
									let ent = sdEntity.entities_by_net_id_cache_map.get( sdWorld.last_hit_entity._plants[ i ] );
									
									if ( ent )
									{
										if ( ent.is( sdGrass ) )
										{
											// Old version problem fix:
											if ( ent._block !== sdWorld.last_hit_entity )
											ent._block = sdWorld.last_hit_entity;
											
											if ( ent.variation < sdWorld.GetFinalGrassHeight( ent.x ) )
											{
												ent.Grow();
												break; // Skip rest plants on this block
											}
										}
									}
									else
									{
										// Old version problem fix:
										sdWorld.last_hit_entity._plants.splice( i, 1 );
										i--;
										continue;
									}
								}
							}
						}
					}
				}
				
				for ( var i = 0; i < sdWorld.sockets.length; i++ )
				if ( sdWorld.sockets[ i ].character )
				if ( !sdWorld.sockets[ i ].character._is_being_removed )
				{
					if ( sdWorld.sockets[ i ].character.driver_of === null )
					if ( this.TraceDamagePossibleHere( sdWorld.sockets[ i ].character.x, sdWorld.sockets[ i ].character.y ) )
					{
						if ( sdWorld.sockets[ i ].character.pain_anim <= 0 && sdWorld.sockets[ i ].character.hea > 0 )
						sdWorld.SendEffect({ x:sdWorld.sockets[ i ].character.x, y:sdWorld.sockets[ i ].character.y + sdWorld.sockets[ i ].character._hitbox_y1, type:sdWorld.sockets[ i ].character.GetBleedEffect(), filter:sdWorld.sockets[ i ].character.GetBleedEffectFilter() });

						sdWorld.sockets[ i ].character.Damage( GSPEED * this.raining_intensity / 240 );
					}
				}
			}
			
			if ( this.quake_intensity >= 100 )
			//for ( let i = 0; i < 100; i++ ) // Hack
			{
				let ent = new sdBlock({ x:0, y:0, width:16, height:16 });
				
				//sdEntity.entities.push( ent );
				
				{
					let x,y;
					
					//let tr = 1000;
					
					let tr = 35;
					
					do
					{
						x = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );
						y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );
						/*
						if ( sdWorld.sockets[ 0 ] && sdWorld.sockets[ 0 ].character )
						{
							x = sdWorld.sockets[ 0 ].character.look_x;
							y = sdWorld.sockets[ 0 ].character.look_y;
						}*/
						
						x = Math.floor( x / 16 ) * 16;
						y = Math.floor( y / 16 ) * 16;
						
						sdWeather.last_crystal_near_quake = null;
						
						if ( ent.CanMoveWithoutOverlap( x, y, 0.0001, sdWeather.CrystalRemovalByEearthquakeFilter ) )
						{
							//if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) )
							//if ( !sdWorld.CheckWallExistsBox( x, y, x+16, y+16, null, null, [ 'sdBlock', 'sdWater' ] ) ) // Extra check for spike blocks and water/lava
							if ( !sdWorld.CheckWallExistsBox( x + 0.0001, y + 0.0001, x+16 - 0.0001, y+16 - 0.0001, null, null, [ 'sdBlock', 'sdWater' ] ) ) // Extra check for spike blocks and water/lava
							{
								let ent_above = null;
								let ent_above_exists = false;

								let ent_below = null;
								let ent_below_exists = false;

								sdWorld.last_hit_entity = null;
								if ( !ent.CanMoveWithoutOverlap( x, y + 16, 0.0001 ) && ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.is( sdBlock ) && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural ) ) )
								{
									ent_below = sdWorld.last_hit_entity;
									ent_below_exists = true;
								}

								sdWorld.last_hit_entity = null;
								if ( !ent.CanMoveWithoutOverlap( x, y - 16, 0.0001 ) && ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.is( sdBlock ) && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural ) ) )
								{
									ent_above = sdWorld.last_hit_entity;
									ent_above_exists = true;
								}

								// Left and right entity will be threaten as above becase they do not require ant extra logic like plant clearence
								if ( !ent_above_exists )
								{
									sdWorld.last_hit_entity = null;
									if ( !ent.CanMoveWithoutOverlap( x - 16, y, 0.0001 ) && ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.is( sdBlock ) && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural ) ) )
									{
										ent_above = sdWorld.last_hit_entity;
										ent_above_exists = true;
									}
									sdWorld.last_hit_entity = null;
									if ( !ent.CanMoveWithoutOverlap( x + 16, y, 0.0001 ) && ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.is( sdBlock ) && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural ) ) )
									{
										ent_above = sdWorld.last_hit_entity;
										ent_above_exists = true;
									}
								}

								if ( ent_above_exists || ent_below_exists )
								{
									let bg_nature = true; // Or nothing or world border
									let bg_nature_ent = null;

									sdWorld.last_hit_entity = null;
									if ( sdWorld.CheckWallExistsBox( x+1, y+1, x + 16-1, y + 16-1, null, null, [ 'sdBG' ], null ) )
									if ( sdWorld.last_hit_entity )
									{
										if ( sdWorld.last_hit_entity.material !== sdBG.MATERIAL_GROUND )
										{
											bg_nature = false;
										}
										else
										{
											bg_nature_ent = sdWorld.last_hit_entity;
										}
									}

									if ( bg_nature )
									{
										function ClearPlants()
										{
											if ( bg_nature_ent )
											bg_nature_ent.remove();

											if ( ent_below_exists )
											if ( ent_below )
											if ( ent_below._plants )
											{
												for ( let i = 0; i < ent_below._plants.length; i++ )
												{
													//let plant = sdEntity.entities_by_net_id_cache[ ent_below._plants[ i ] ];
													let plant = sdEntity.entities_by_net_id_cache_map.get( ent_below._plants[ i ] );
													if ( plant )
													plant.remove();
												}
												ent_below._plants = null;
											}
										}

										let xx = Math.floor( x / 16 );
										let from_y = sdWorld.GetGroundElevation( xx );

										if ( y >= from_y )
										{
											let r = sdWorld.FillGroundQuad( x, y, from_y, false, true );

											if ( r )
											ClearPlants();

											// Delete temp block on success
											//ent.remove();
											break;
										}
										else
										if ( y === from_y - 8 )
										{
											y += 8;
											let r = sdWorld.FillGroundQuad( x, y, from_y, true, true );

											if ( r )
											ClearPlants();

											// Delete temp block on success
											//ent.remove();
											break;
										}
										else
										{
											//debugger;
										}


									}
								}


							}
						}
						else
						if ( sdWeather.last_crystal_near_quake )
						{
							sdWorld.last_hit_entity = null;
							if ( sdWorld.CheckWallExistsBox( x - 4, y + 4, x+16 + 4, y+16 + 4, null, null, [ 'sdBlock' ] ) && ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.is( sdBlock ) && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural ) )  )
							{
								//sdWeather.last_crystal_near_quake.Damage( 15 );
								sdWeather.last_crystal_near_quake.Damage( 20 );
							}
						}

						tr--;
						if ( tr < 0 )
						{
							//ent.remove();
							break;
						}
					} while( true );
				}
				
				//ent.onRemove = ent.onRemoveAsFakeEntity; // Disable any removal logic
				ent.SetMethod( 'onRemove', ent.onRemoveAsFakeEntity ); // Disable any removal logic BUT without making .onRemove method appearing in network snapshot
				ent.remove();
				ent._remove();
			}
			
			//this._time_until_event = 0; // Hack
			
			this._time_until_event -= GSPEED;
			if ( this._time_until_event < 0 )
			{
				//this._time_until_event = Math.random() * 30 * 60 * 8; // once in an ~4 minutes (was 8 but more event kinds = less events sort of)
				//this._time_until_event = Math.random() * 30 * 60 * 3; // Changed after sdWeather logic was being called twice, which caused events to happen twice as frequently
				this._time_until_event = Math.random() * 30 * 60 * 3 * ( 12 / 5 ); // Changed after introducing "daily events" since there is only up to 5 events that can happen to prevent their overflow
				/*let allowed_event_ids = ( sdWorld.server_config.GetAllowedWorldEvents ? sdWorld.server_config.GetAllowedWorldEvents() : undefined ) || [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
				
				let disallowed_ones = ( sdWorld.server_config.GetDisallowedWorldEvents ? sdWorld.server_config.GetDisallowedWorldEvents() : [] );
				
				//allowed_event_ids = [ 8 ]; // Hack
				
				for ( let d = 0; d < allowed_event_ids.length; d++ )
				if ( disallowed_ones.indexOf( allowed_event_ids[ d ] ) !== -1 )
				{
					allowed_event_ids.splice( d, 1 );
					d--;
					continue;
				}*/

				let allowed_event_ids = this._daily_events;
				if ( allowed_event_ids.length > 0 )
				{
					let r = allowed_event_ids[ ~~( Math.random() * allowed_event_ids.length ) ];
					//console.log( r );

					//r = 3; // Hack

					if ( r === 0 )
					this._rain_amount = 30 * 15 * ( 1 + Math.random() * 2 ); // start rain for ~15 seconds

					if ( r === 1 )
					this._asteroid_spam_amount = 30 * 15 * ( 1 + Math.random() * 2 );

					if ( r === 2 )
					{
						for ( let t = Math.ceil( Math.random() * 2 * sdWorld.GetPlayingPlayersCount() ) + 1; t > 0; t-- )
						if ( sdCube.alive_cube_counter < sdCube.GetMaxAllowedCubesOfKind( 0 ) ) // 20
						{
							let cube = new sdCube({ 
								x:sdWorld.world_bounds.x1 + 32 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 - 64 ), 
								y:sdWorld.world_bounds.y1 + 32,
								kind:   ( sdCube.alive_huge_cube_counter < sdCube.GetMaxAllowedCubesOfKind( 1 ) && ( sdCube.alive_cube_counter >= 2 && Math.random() < 0.1 ) ) ? 1 : 
										( sdCube.alive_white_cube_counter < sdCube.GetMaxAllowedCubesOfKind( 2 ) && ( sdCube.alive_cube_counter >= 2 && Math.random() < 0.04 ) ) ? 2 : 
										( sdCube.alive_pink_cube_counter < sdCube.GetMaxAllowedCubesOfKind( 3 ) && ( sdCube.alive_cube_counter >= 1 && Math.random() < 0.14 ) ) ? 3 : 
										0 // _kind = 1 -> is_huge = true , _kind = 2 -> is_white = true , _kind = 3 -> is_pink = true
							});
							cube.sy += 10;
							sdEntity.entities.push( cube );

							if ( !cube.CanMoveWithoutOverlap( cube.x, cube.y, 0 ) )
							{
								cube.remove();
								cube._broken = false;
							}
							else
							sdWorld.UpdateHashPosition( cube, false ); // Prevent inersection with other ones
						}
					}

					if ( r === 3 )
					{
						let ais = 0;

						for ( var i = 0; i < sdCharacter.characters.length; i++ )
						if ( sdCharacter.characters[ i ].hea > 0 )
						if ( !sdCharacter.characters[ i ]._is_being_removed )
						if ( sdCharacter.characters[ i ]._ai )
						{
							ais++;
						}

						let instances = 0;
						let instances_tot = 3 + ( ~~( Math.random() * 3 ) );

						let left_side = ( Math.random() < 0.5 );

						while ( instances < instances_tot && ais < 8 )
						{

							let character_entity = new sdCharacter({ x:0, y:0 });

							sdEntity.entities.push( character_entity );

							{
								let x,y;
								let tr = 1000;
								do
								{
									if ( left_side )
									x = sdWorld.world_bounds.x1 + 16 + 16 * instances;
									else
									x = sdWorld.world_bounds.x2 - 16 - 16 * instances;

									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( character_entity.CanMoveWithoutOverlap( x, y, 0 ) )
									if ( !character_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
									if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) ) // Only spawn on ground
									{
										character_entity.x = x;
										character_entity.y = y;

										//sdWorld.UpdateHashPosition( ent, false );
										if ( Math.random() < 0.07 )
										{
											if ( Math.random() < 0.2 )
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_FALKOK_PSI_CUTTER }) );
												character_entity._ai_gun_slot = 4;
											}
											else
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_RAYGUN }) );
												character_entity._ai_gun_slot = 3;
											}
										}
										else
										{ 
											if ( Math.random() < 0.1 )
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_F_MARKSMAN }) );
												character_entity._ai_gun_slot = 2;
											}
											else
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_FALKOK_RIFLE }) );
												character_entity._ai_gun_slot = 2;
											}
										}
										let falkok_settings;
										if ( character_entity._ai_gun_slot === 2 )
										falkok_settings = {"hero_name":"Falkok","color_bright":"#6b0000","color_dark":"#420000","color_bright3":"#6b0000","color_dark3":"#420000","color_visor":"#5577b9","color_suit":"#240000","color_suit2":"#2e0000","color_dark2":"#560101","color_shoes":"#000000","color_skin":"#240000","helmet1":false,"helmet2":true,"voice1":false,"voice2":false,"voice3":true,"voice4":false,"voice5":false,"voice6":true};
										if ( character_entity._ai_gun_slot === 3 || character_entity._ai_gun_slot === 4 ) // If Falkok spawns with Raygun or PSI-Cutter, change their looks Phoenix Falkok
										falkok_settings = {"hero_name":"Phoenix Falkok","color_bright":"#ffc800","color_dark":"#a37000","color_bright3":"#ffc800","color_dark3":"#a37000","color_visor":"#000000","color_suit":"#ffc800","color_suit2":"#ffc800","color_dark2":"#000000","color_shoes":"#a37000","color_skin":"#a37000","helmet1":false,"helmet12":true,"voice1":false,"voice2":false,"voice3":true,"voice4":false,"voice5":false,"voice6":true};

										character_entity.sd_filter = sdWorld.ConvertPlayerDescriptionToSDFilter_v2( falkok_settings );
										character_entity._voice = sdWorld.ConvertPlayerDescriptionToVoice( falkok_settings );
										character_entity.helmet = sdWorld.ConvertPlayerDescriptionToHelmet( falkok_settings );
										character_entity.title = falkok_settings.hero_name;
										if ( character_entity._ai_gun_slot === 2 ) // If a regular falkok spawns
										{
											character_entity.matter = 75;
											character_entity.matter_max = 75;

											character_entity.hea = 115; // 105 so railgun requires at least headshot to kill and body shot won't cause bleeding
											character_entity.hmax = 115;

											character_entity._damage_mult = 1 / 2.5; // 1 / 4 was too weak
										}

										if ( character_entity._ai_gun_slot === 3 || character_entity._ai_gun_slot === 4 ) // If a Phoenix Falkok spawns
										{
											character_entity.matter = 100;
											character_entity.matter_max = 100;

											character_entity.hea = 250; // It is a stronger falkok after all, although revert changes if you want
											character_entity.hmax = 250;

											character_entity._damage_mult = 1 / 1.5; // Rarer enemy therefore more of a threat?
										}	
										character_entity._ai = { direction: ( x > ( sdWorld.world_bounds.x1 + sdWorld.world_bounds.x2 ) / 2 ) ? -1 : 1 };
										character_entity._ai_enabled = sdCharacter.AI_MODEL_FALKOK;
										
										character_entity._ai_level = Math.floor( Math.random() * 2 ); // Either 0 or 1
										
										character_entity._matter_regeneration = 1 + character_entity._ai_level; // At least some ammo regen
										character_entity._jetpack_allowed = true; // Jetpack
										character_entity._recoil_mult = 1 - ( 0.0055 * character_entity._ai_level ) ; // Small recoil reduction based on AI level
										character_entity._jetpack_fuel_multiplier = 0.25; // Less fuel usage when jetpacking
										character_entity._ai_team = 1; // AI team 1 is for Falkoks, preparation for future AI factions
										character_entity._matter_regeneration_multiplier = 10; // Their matter regenerates 10 times faster than normal, unupgraded players

										break;
									}


									tr--;
									if ( tr < 0 )
									{
										character_entity.remove();
										character_entity._broken = false;
										break;
									}
								} while( true );
							}

							instances++;
							ais++;
						}
					}

					if ( r === 4 )
					{
						for ( let t = Math.ceil( Math.random() * 2 * sdWorld.GetPlayingPlayersCount() ) + 1; t > 0; t-- )
						if ( sdAsp.asps_tot < 25 )
						{
							let asp = new sdAsp({ 
								x:sdWorld.world_bounds.x1 + 32 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 - 64 ), 
								y:sdWorld.world_bounds.y1 + 32
							});
							//asp.sy += 10;
							sdEntity.entities.push( asp );

							if ( !asp.CanMoveWithoutOverlap( asp.x, asp.y, 0 ) )
							{
								asp.remove();
								asp._broken = false;
							}
							else
							sdWorld.UpdateHashPosition( asp, false ); // Prevent inersection with other ones
						}
					}
					
					if ( r === 5 ) // Falkok invasion event
					{
						if ( this._invasion === false ) // Prevent invasion resetting
						{
							this._invasion = true;
							this._invasion_timer = 120 ; // 2 minutes; using GSPEED for measurement (feel free to change that, I'm not sure how it should work)
							this._invasion_spawn_timer = 0;
							this._invasion_spawns_con = 30; // At least 30 Falkoks must spawn otherwise invasion will not end
							//console.log('Invasion incoming!');
							{ // Spawn some drones as invasion starts
								let instances = 0;
								let instances_tot = Math.min( 6 ,Math.ceil( ( Math.random() * 2 * sdWorld.GetPlayingPlayersCount() ) ) );

								let left_side = ( Math.random() < 0.5 );

								while ( instances < instances_tot && sdDrone.drones_tot < 20 )
								{

									let drone = new sdDrone({ x:0, y:0 , _ai_team: 1});

									sdEntity.entities.push( drone );

									{
										let x,y;
										let tr = 1000;
										do
										{
											if ( left_side )
											x = sdWorld.world_bounds.x1 + 64 + 64 * instances;
											else
											x = sdWorld.world_bounds.x2 - 64 - 64 * instances;

											y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

											if ( drone.CanMoveWithoutOverlap( x, y, 0 ) )
											//if ( !mech_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
											//if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) )
											{
												drone.x = x;
												drone.y = y;

												//sdWorld.UpdateHashPosition( ent, false );
												//console.log('Drone spawned!');
												break;
											}


											tr--;
											if ( tr < 0 )
											{
												drone.remove();
												drone._broken = false;
												break;
											}
										} while( true );
									}
									instances++;
								}
							}
						}
						else
						this._time_until_event = Math.random() * 30 * 60 * 1; // if the event is already active, quickly initiate something else
						
					}

					if ( r === 6 ) // Big virus event
					{
						let instances = 0;
						let instances_tot = 1 + Math.ceil( Math.random() * 3 );

						let left_side = ( Math.random() < 0.5 );

						while ( instances < instances_tot && sdVirus.viruses_tot < 40  && sdVirus.big_viruses < 4 )
						{

							let virus_entity = new sdVirus({ x:0, y:0 });
							virus_entity._is_big = true;
							sdEntity.entities.push( virus_entity );
							sdVirus.big_viruses++;
							{
								let x,y;
								let tr = 1000;
								do
								{
									if ( left_side )
									x = sdWorld.world_bounds.x1 + 32 + 64 * instances;
									else
									x = sdWorld.world_bounds.x2 - 32 - 64 * instances;

									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( virus_entity.CanMoveWithoutOverlap( x, y, 0 ) )
									if ( virus_entity.CanMoveWithoutOverlap( x + 32, y, 0 ) )
									if ( virus_entity.CanMoveWithoutOverlap( x - 32, y, 0 ) )
									if ( virus_entity.CanMoveWithoutOverlap( x, y - 32, 0 ) )
									if ( virus_entity.CanMoveWithoutOverlap( x + 32, y - 32, 0 ) )
									if ( virus_entity.CanMoveWithoutOverlap( x - 32, y - 32, 0 ) )
									if ( !virus_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
									if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) ) // Only spawn on ground
									{
										virus_entity.x = x;
										virus_entity.y = y;

										//sdWorld.UpdateHashPosition( ent, false );
										//console.log('Big virus spawned!');
										//console.log(sdVirus.big_viruses);
										break;
									}


									tr--;
									if ( tr < 0 )
									{
										virus_entity.remove();
										virus_entity._broken = false;
										break;
									}
								} while( true );
							}

							instances++;
						}
					}
					
					if ( r === 7 ) // Flying Mech event
					{
						let instances = 0;
						let instances_tot = Math.ceil( ( Math.random() * sdWorld.GetPlayingPlayersCount() ) / 3 );

						let left_side = ( Math.random() < 0.5 );

						while ( instances < instances_tot && sdEnemyMech.mechs_counter < 3 )
						{

							let mech_entity = new sdEnemyMech({ x:0, y:0 });

							sdEntity.entities.push( mech_entity );

							{
								let x,y;
								let tr = 1000;
								do
								{
									if ( left_side )
									x = sdWorld.world_bounds.x1 + 64 + 64 * instances;
									else
									x = sdWorld.world_bounds.x2 - 64 - 64 * instances;

									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( mech_entity.CanMoveWithoutOverlap( x, y, 0 ) )
									//if ( !mech_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
									//if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) )
									{
										mech_entity.x = x;
										mech_entity.y = y;

										//sdWorld.UpdateHashPosition( ent, false );
										//console.log('Flying mech spawned!');
										break;
									}


									tr--;
									if ( tr < 0 )
									{
										mech_entity.remove();
										mech_entity._broken = false;
										break;
									}
								} while( true );
							}

							instances++;
						}
					}
					
					if ( r === 8 ) // Earth quake, idea by LazyRain, implementation by Eric Gurt
					{
						this._quake_scheduled_amount = 30 * ( 10 + Math.random() * 30 );
					}
					
					if ( r === 9 ) // Spawn few sdBadDog-s somewhere on ground where players don't see them
					{
						let instances = Math.floor( 3 + Math.random() * 6 );
						while ( instances > 0 && sdBadDog.dogs_counter < 16 )
						{

							let dog = new sdBadDog({ x:0, y:0 });

							sdEntity.entities.push( dog );

							{
								let x,y,i;
								let tr = 1000;
								do
								{
									x = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );
									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( dog.CanMoveWithoutOverlap( x, y, 0 ) )
									if ( !dog.CanMoveWithoutOverlap( x, y + 32, 0 ) )
									if ( sdWorld.last_hit_entity )
									if ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural )
									if ( !sdWorld.CheckWallExistsBox( 
											x + dog._hitbox_x1 - 16, 
											y + dog._hitbox_y1 - 16, 
											x + dog._hitbox_x2 + 16, 
											y + dog._hitbox_y2 + 16, null, null, [ 'sdWater' ], null ) )
									{
										let di_allowed = true;
										
										for ( i = 0; i < sdWorld.sockets.length; i++ )
										if ( sdWorld.sockets[ i ].character )
										{
											let di = sdWorld.Dist2D( sdWorld.sockets[ i ].character.x, sdWorld.sockets[ i ].character.y, x, y );
											
											if ( di < 500 )
											{
												di_allowed = false;
												break;
											}
										}
										
										if ( di_allowed )
										{
											dog.x = x;
											dog.y = y;

											break;
										}
									}
									


									tr--;
									if ( tr < 0 )
									{
										dog.remove();
										dog._broken = false;
										break;
									}
								} while( true );
							}

							instances--;
						}
					}

					if ( r === 10 ) // Portal event
					{
						if ( Math.random() < 0.7 ) // 70% chance for rift portal to spawn
						{
							let instances = 1;
							while ( instances > 0 && sdRift.portals < 2 )
							{

								let portal = new sdRift({ x:0, y:0 });

								sdEntity.entities.push( portal );

								{
									let x,y,i;
									let tr = 1000;
									do
									{
										x = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );
										y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );
										if ( Math.random() < 0.2 ) // 20% chance it's a "Cube" spawning portal
										portal.tier = 2;

										if ( portal.CanMoveWithoutOverlap( x, y, 0 ) )
										if ( !portal.CanMoveWithoutOverlap( x, y + 24, 0 ) )
										if ( sdWorld.last_hit_entity )
										if ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural )
										if ( !sdWorld.CheckWallExistsBox( 
												x + portal._hitbox_x1 - 8, 
												y + portal._hitbox_y1 - 8, 
												x + portal._hitbox_x2 + 8, 
												y + portal._hitbox_y2 + 8, null, null, [ 'sdWater' ], null ) )
										{
											portal.x = x;
											portal.y = y;

											break;
										}
									


										tr--;
										if ( tr < 0 )
										{
											portal.remove();
											portal._broken = false;
											break;
										}
									} while( true );
								}

							instances--;
							}
						}
						else
						this._time_until_event = Math.random() * 30 * 60 * 1; // Quickly switch to another event
					}
					
					if ( r === 11 ) // Spawn 3-6 sdSpiders, drones somewhere on ground where players don't see them and Erthal humanoids
					{
						let instances = Math.floor( 3 + Math.random() * 4 );
						while ( instances > 0 && sdSpider.spider_counter < Math.min( 32, sdWorld.GetPlayingPlayersCount() * 10 ) )
						{

							let ent = new sdSpider({ x:0, y:0 });
							sdEntity.entities.push( ent );
							ent.type = ( Math.random() < 0.05 ) ? 1 : 0;

							//if ( sdDrone.drones_tot < 20 ) // Not sure if this is needed to be honest, it also causes error because "let" can't be behind an "if" directly - Booraz149
							let ent_drone = new sdDrone({ x:0, y:0, _ai_team: 2, type: 2 }); 
							sdEntity.entities.push( ent_drone );


							{
								let x,y,i;
								let tr = 1000;
								do
								{
									x = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );
									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( ent.CanMoveWithoutOverlap( x, y, 0 ) )
									if ( !ent.CanMoveWithoutOverlap( x, y + 32, 0 ) )
									if ( ent_drone.CanMoveWithoutOverlap( x, y - 48, 0 ) ) // Check if drones have enough space to be placed above Erthal spider bots.
									if ( sdWorld.last_hit_entity )
									if ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural )
									if ( !sdWorld.CheckWallExistsBox( 
											x + ent._hitbox_x1 - 16, 
											y + ent._hitbox_y1 - 116, 
											x + ent._hitbox_x2 + 16, 
											y + ent._hitbox_y2 + 16, null, null, [ 'sdWater' ], null ) )
									{
										let di_allowed = true;
										
										for ( i = 0; i < sdWorld.sockets.length; i++ )
										if ( sdWorld.sockets[ i ].character )
										{
											let di = sdWorld.Dist2D( sdWorld.sockets[ i ].character.x, sdWorld.sockets[ i ].character.y, x, y );
											
											if ( di < 700 )
											{
												di_allowed = false;
												break;
											}
										}
										
										if ( di_allowed )
										{
											ent.x = x;
											ent.y = y;

											ent_drone.x = x;
											ent_drone.y = y - 48;

											break;
										}
									}
									


									tr--;
									if ( tr < 0 )
									{
										ent.remove();
										ent._broken = false;

										ent_drone.remove();
										ent_drone._broken = false;
										break;
									}
								} while( true );
							}

							instances--;
						}
						let ais = 0;
						let percent = 0;
						for ( var i = 0; i < sdCharacter.characters.length; i++ )
						{
							if ( sdCharacter.characters[ i ].hea > 0 )
							if ( !sdCharacter.characters[ i ]._is_being_removed )
							if ( sdCharacter.characters[ i ]._ai_team === 2 )
							{
								ais++;
							}

							if ( sdCharacter.characters[ i ].hea > 0 )
							if ( !sdCharacter.characters[ i ]._is_being_removed )
							//if ( !sdCharacter.characters[ i ]._ai )
							if ( sdCharacter.characters[ i ].build_tool_level > 0 )
							{
								percent++;
							}
						}
						if ( Math.random() < ( percent / sdWorld.GetPlayingPlayersCount() ) ) // Spawn chance depends on RNG, chances increase if more players ( or all ) have at least one built tool / shop upgrade
						{
							let robots = 0;
							let robots_tot = 1 + ( ~~( Math.random() * 2 ) );

							let left_side = ( Math.random() < 0.5 );

							while ( robots < robots_tot && ais < 8 )
							{

								let character_entity = new sdCharacter({ x:0, y:0 });

								sdEntity.entities.push( character_entity );

								{
									let x,y;
									let tr = 1000;
									do
									{
										if ( left_side )
										x = sdWorld.world_bounds.x1 + 16 + 16 * robots;
										else
										x = sdWorld.world_bounds.x2 - 16 - 16 * robots;

										y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

										if ( character_entity.CanMoveWithoutOverlap( x, y, 0 ) )
										if ( !character_entity.CanMoveWithoutOverlap( x, y + 32, 0 ) )
										if ( sdWorld.last_hit_entity === null || ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND ) ) // Only spawn on ground
										{
											character_entity.x = x;
											character_entity.y = y;

											//sdWorld.UpdateHashPosition( ent, false );
											if ( Math.random() < 0.3 )
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_ERTHAL_BURST_RIFLE }) );
												character_entity._ai_gun_slot = 2;
											}
											else
											{
												sdEntity.entities.push( new sdGun({ x:character_entity.x, y:character_entity.y, class:sdGun.CLASS_ERTHAL_PLASMA_PISTOL }) );
												character_entity._ai_gun_slot = 1;
											}
											let robot_settings;
											//if ( character_entity._ai_gun_slot === 2 )
											robot_settings = {"hero_name":"Erthal","color_bright":"#37a2ff","color_dark":"#000000","color_bright3":"#464646","color_dark3":"#000000","color_visor":"#1664a8","color_suit":"#464646","color_suit2":"#000000","color_dark2":"#464646","color_shoes":"#000000","color_skin":"#1665a8","color_extra1":"#464646","helmet1":false,"helmet4":true,"body3":true,"legs3":true,"voice1":false,"voice2":false,"voice3":true,"voice4":false,"voice5":false,"voice6":false,"voice7":true};

											character_entity.sd_filter = sdWorld.ConvertPlayerDescriptionToSDFilter_v2( robot_settings );
											character_entity._voice = sdWorld.ConvertPlayerDescriptionToVoice( robot_settings );
											character_entity.helmet = sdWorld.ConvertPlayerDescriptionToHelmet( robot_settings );
											character_entity.title = robot_settings.hero_name;
											character_entity.body = sdWorld.ConvertPlayerDescriptionToBody( robot_settings );
											character_entity.legs = sdWorld.ConvertPlayerDescriptionToLegs( robot_settings );
											if ( character_entity._ai_gun_slot === 2 || character_entity._ai_gun_slot === 1 )
											{
												character_entity.matter = 150;
												character_entity.matter_max = 150;

												character_entity.hea = 250;
												character_entity.hmax = 250;

												character_entity.armor = 250;
												character_entity.armor_max = 500;
												character_entity._armor_absorb_perc = 0.75; // 75% damage absorption, since armor will run out before health, they effectively have 750 health

												character_entity._damage_mult = 1; // Supposed to put up a challenge
											}

											/*if ( character_entity._ai_gun_slot === 3 || character_entity._ai_gun_slot === 4 ) // Nothing here so far
											{
												character_entity.matter = 100;
												character_entity.matter_max = 100;

												character_entity.hea = 250;
												character_entity.hmax = 250;

												character_entity._damage_mult = 1 / 1.5; // Rarer enemy therefore more of a threat?
											}*/	
											character_entity._ai = { direction: ( x > ( sdWorld.world_bounds.x1 + sdWorld.world_bounds.x2 ) / 2 ) ? -1 : 1 };
											character_entity._ai_enabled = sdCharacter.AI_MODEL_FALKOK;
										
											character_entity._ai_level = 4;
										
											character_entity._matter_regeneration = 1 + character_entity._ai_level; // At least some ammo regen
											character_entity._jetpack_allowed = true; // Jetpack
											character_entity._recoil_mult = 1 - ( 0.0055 * character_entity._ai_level ) ; // Small recoil reduction based on AI level
											character_entity._jetpack_fuel_multiplier = 0.25; // Less fuel usage when jetpacking
											character_entity._ai_team = 2; // AI team 2 is for Erthal
											character_entity._matter_regeneration_multiplier = 10; // Their matter regenerates 10 times faster than normal, unupgraded players

										break;
									}


									tr--;
									if ( tr < 0 )
									{
										character_entity.remove();
										character_entity._broken = false;
										break;
									}
								} while( true );
							}

							robots++;
							ais++;
							//console.log('Erthal spawned!');
							}
						}
					}
					
					if ( r === 12 ) // Spawn sdAmphids in water where players don't see them
					{
						let instances = Math.floor( 3 + Math.random() * 6 );
						while ( instances > 0 && sdAmphid.amphids_tot < 16 )
						{

							let amphid = new sdAmphid({ x:0, y:0 });

							sdEntity.entities.push( amphid );

							{
								let x,y,i;
								let tr = 1000;
								do
								{
									x = sdWorld.world_bounds.x1 + Math.random() * ( sdWorld.world_bounds.x2 - sdWorld.world_bounds.x1 );
									y = sdWorld.world_bounds.y1 + Math.random() * ( sdWorld.world_bounds.y2 - sdWorld.world_bounds.y1 );

									if ( amphid.CanMoveWithoutOverlap( x, y, 0 ) )
									if ( amphid.CanMoveWithoutOverlap( x, y - 48, 0 ) )
									if ( sdWorld.last_hit_entity )
									if ( sdWorld.last_hit_entity.GetClass() === 'sdBlock' && sdWorld.last_hit_entity.material === sdBlock.MATERIAL_GROUND && sdWorld.last_hit_entity._natural )
									if ( sdWorld.CheckWallExistsBox( 
											x + amphid._hitbox_x1 - 32, 
											y + amphid._hitbox_y1 - 32, 
											x + amphid._hitbox_x2 + 32, 
											y + amphid._hitbox_y2 + 32, null, null, [ 'sdWater' ], null ) )
									{
										let di_allowed = true;
										
										for ( i = 0; i < sdWorld.sockets.length; i++ )
										if ( sdWorld.sockets[ i ].character )
										{
											let di = sdWorld.Dist2D( sdWorld.sockets[ i ].character.x, sdWorld.sockets[ i ].character.y, x, y );
											
											if ( di < 500 )
											{
												di_allowed = false;
												break;
											}
										}
										
										if ( di_allowed )
										{
											amphid.x = x;
											amphid.y = y;

											break;
										}
									}
									


									tr--;
									if ( tr < 0 )
									{
										amphid.remove();
										amphid._broken = false;
										break;
									}
								} while( true );
							}

							instances--;
						}
					}
				}
			}
		}
		else
		{
			//this._rain_offset = ( this._rain_offset + GSPEED ) % 32;
			
			sdWorld.world_bounds.x1 = this.x1;
			sdWorld.world_bounds.y1 = this.y1;
			sdWorld.world_bounds.x2 = this.x2;
			sdWorld.world_bounds.y2 = this.y2;
		}
	}
	static CrystalRemovalByEearthquakeFilter( ent )
	{
		if ( ent )
		//if ( ent.is( sdCrystal ) )
		if ( !ent._natural )
		if ( ent.IsTargetable() )
		{
			sdWeather.last_crystal_near_quake = ent;
			//return false;
		}
		
		return true;
	}
	Draw( ctx, attached )
	{
		ctx.translate( -this.x, -this.y ); // sdWeather does move now just so it is kept inisde of world bounds and not gets removed with old areas
		//
		//ctx.translate( Math.floor(( sdWorld.camera.x - sdRenderer.screen_width / sdWorld.camera.scale )/32)*32, 
		//               Math.floor(( sdWorld.camera.y - sdRenderer.screen_height / sdWorld.camera.scale )/32)*32 );
		
		/*
		for ( var x = 0; x < sdRenderer.screen_width; x += 32 )
		for ( var y = 0; y < sdRenderer.screen_height; y += 32 )
		{
		    ctx.drawImage( sdWeather.img_rain, 
		        x - 16 + ( ( y % 32 < 16 ) ? 16 : 0 ), 
		        y - 16 + ( sdWorld.time % 32 ), 
		        32,32 );
	    }*/
		
		if ( this.raining_intensity > 0 )
		{
			ctx.globalAlpha = Math.pow( this.raining_intensity / 50, 1 );
			for ( var i = 0; i < sdWeather.pattern.length * this.raining_intensity / 100; i++ )
			{
				var p = sdWeather.pattern[ i ];

				var xx = sdWorld.mod( p.x * sdRenderer.screen_width - sdWorld.camera.x, sdRenderer.screen_width ) + sdWorld.camera.x - sdRenderer.screen_width / sdWorld.camera.scale;
				var yy = sdWorld.mod( p.y * sdRenderer.screen_height + ( sdWorld.time * 0.3 ) - sdWorld.camera.y, sdRenderer.screen_height ) + sdWorld.camera.y - sdRenderer.screen_height / sdWorld.camera.scale;

				var just_one_step_check = ( Math.random() > 0.1 && p.last_y < yy && Math.abs( p.last_x - xx ) < 100 );

				p.last_x = xx;
				p.last_y = yy;

				if ( just_one_step_check )
				{
					if ( p.last_vis )
					{
						p.last_vis = this.TraceDamagePossibleHere( xx, yy, 2 );
						if ( this.raining_intensity >= 30 )
						if ( !p.last_vis )
						{
						    let e = new sdEffect({ x:xx, y:yy, type:sdEffect.TYPE_BLOOD_GREEN, filter:'opacity('+(~~((ctx.globalAlpha * 0.5)*10))/10+')' });
						    sdEntity.entities.push( e );
						}
					}
				}
				else
				p.last_vis = this.TraceDamagePossibleHere( xx, yy, Infinity );

				var vis = p.last_vis;

				if ( vis )
				ctx.drawImageFilterCache( sdWeather.img_rain, 
					xx - 16, 
					yy - 16, 
					32,32 );
			}
			ctx.globalAlpha = 1;
		}
	}
	
	onRemove() // Class-specific, if needed
	{
		if ( sdWeather.only_instance === this )
		sdWeather.only_instance = null;
	}
}
//sdWeather.init_class();

export default sdWeather;
