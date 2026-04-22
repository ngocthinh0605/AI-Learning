class CreateMultiplayerRooms < ActiveRecord::Migration[7.1]
  def change
    create_table :rooms, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :name, null: false
      t.text :description
      t.uuid :owner_id, null: false
      t.timestamps
    end
    add_index :rooms, :name
    add_foreign_key :rooms, :users, column: :owner_id

    create_table :room_memberships, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid :room_id, null: false
      t.uuid :user_id, null: false
      t.string :role, null: false, default: "member"
      t.timestamps
    end
    add_index :room_memberships, [:room_id, :user_id], unique: true
    add_foreign_key :room_memberships, :rooms
    add_foreign_key :room_memberships, :users

    create_table :room_messages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid :room_id, null: false
      t.uuid :user_id, null: false
      t.text :content, null: false
      t.timestamps
    end
    add_index :room_messages, [:room_id, :created_at]
    add_foreign_key :room_messages, :rooms
    add_foreign_key :room_messages, :users
  end
end
