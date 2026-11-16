import React, { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import {
  ActionState,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Page,
  ProfileButton,
  QueryState,
  Txt,
} from "../ui";
export function Ask() {
  const { state } = useNekath();
  const params = useLocalSearchParams<{
    profileId?: string;
    snapshotId?: string;
  }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  return (
    <AskProfile
      key={profileId + ":" + params.snapshotId}
      profileId={profileId}
      snapshotId={params.snapshotId}
    />
  );
}
function AskProfile({
  profileId,
  snapshotId,
}: {
  profileId: string;
  snapshotId?: string;
}) {
  const { state, api } = useNekath();
  const [selected, setSelected] = useState<string | null>(null),
    [text, setText] = useState("");
  const action = useAction();
  const list = useQuery("conversations:" + profileId, () =>
    api.call("conversations", { profileId }).then((r) => ({
      ...r,
      data: r.data.filter(
        (c) => !snapshotId || c.chartSnapshotId === snapshotId,
      ),
    })),
  );
  const current =
    list.data?.find((c) => c.id === selected) ??
    (selected === null ? list.data?.[0] : undefined);
  const person = state.profiles.find((p) => p.id === profileId);
  const send = () => {
    const question = text.trim(),
      conversation = current;
    void action.run(
      async (key) => {
        const chat =
          conversation ??
          (
            await api.call(
              "createConversation",
              { profileId, chartSnapshotId: snapshotId },
              key + ":conversation",
            )
          ).data;
        const response = await api.call(
          "sendMessage",
          { conversationId: chat.id, text: question },
          key + ":message",
        );
        return response.data.conversation;
      },
      (conversation) => {
        setSelected(conversation.id);
        setText("");
      },
    );
  };
  return (
    <Page
      back={!!snapshotId}
      title="Ask a question"
      subtitle={person?.name}
      action={<ProfileButton />}
    >
      <Card>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Txt bold>{state.questionCredits} credits remaining</Txt>
          <Chip title="Add credits" onPress={() => router.push("/plans")} />
        </View>
        <Field
          label="Your question"
          value={text}
          onChange={(value) => setText(value.slice(0, 2000))}
          placeholder="Ask about Lagna, Dasha or Hora…"
          multiline
        />
        <Button
          title="Use a voice sample"
          secondary
          icon="mic-outline"
          onPress={() =>
            Alert.alert(
              "Voice sample",
              "Choose sample text. No microphone recording is used.",
              [
                {
                  text: "What does Lagna mean?",
                  onPress: () => setText("What does Lagna mean?"),
                },
                {
                  text: "Explain Dasha",
                  onPress: () => setText("Explain Dasha"),
                },
                { text: "Cancel", style: "cancel" },
              ],
            )
          }
        />
        <ActionState action={action} />
        <Button
          title={action.busy ? "Getting an answer…" : "Send question"}
          disabled={action.busy || !text.trim()}
          onPress={send}
        />
      </Card>
      <QueryState query={list} label="Loading conversations…">
        {(conversations) => (
          <>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip
                title="New conversation"
                selected={selected === "new"}
                onPress={() => {
                  setSelected("new");
                  action.clear();
                }}
              />
              {conversations.map((chat) => (
                <Chip
                  key={chat.id}
                  title={chat.title.slice(0, 30)}
                  selected={current?.id === chat.id}
                  onPress={() => {
                    setSelected(chat.id);
                    action.clear();
                  }}
                />
              ))}
            </View>
            {current ? (
              <>
                <Txt muted size={12}>
                  {current.profileName} · chart basis {current.chartSnapshotId}
                </Txt>
                {current.messages.map((message) => (
                  <Card key={message.id}>
                    <Badge
                      text={
                        message.role === "user" ? "You" : "Chart explanation"
                      }
                      green={message.role === "assistant"}
                    />
                    <Txt>{message.text}</Txt>
                    {message.evidenceRefs.length ? (
                      <Button
                        title="View supporting chart"
                        secondary
                        onPress={() =>
                          router.push({
                            pathname: "/chart-detail",
                            params: {
                              profileId: current.profileId,
                              snapshotId: current.chartSnapshotId,
                            },
                          })
                        }
                      />
                    ) : null}
                  </Card>
                ))}
                {!current.messages.length ? (
                  <Txt muted>
                    Your conversation is ready. Send a question to begin.
                  </Txt>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="Start a conversation"
                body="Your questions and answers stay attached to this person's chart basis."
              />
            )}
          </>
        )}
      </QueryState>
    </Page>
  );
}
